import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type ResendRecord = {
  record?: string;
  name?: string;
  type?: string;
  value?: string;
  status?: string;
  ttl?: string;
};

type ResendDomain = {
  id: string;
  name: string;
  status?: string;
  region?: string;
  records?: ResendRecord[];
};

type DnsStatus = "verified" | "pending" | "failed" | "missing";

function normalizeStatus(s?: string): DnsStatus {
  const v = (s ?? "").toLowerCase();
  if (v === "verified" || v === "valid" || v === "success") return "verified";
  if (v === "failed" || v === "failure" || v === "invalid") return "failed";
  if (!v || v === "not_started") return "missing";
  return "pending";
}

function classifyRecord(r: ResendRecord): "SPF" | "DKIM" | "DMARC" | "OTHER" {
  const tag = (r.record ?? "").toUpperCase();
  if (tag === "SPF" || tag === "DKIM" || tag === "DMARC") return tag as any;
  const name = (r.name ?? "").toLowerCase();
  const value = (r.value ?? "").toLowerCase();
  if (name.startsWith("_dmarc")) return "DMARC";
  if (value.includes("v=spf1")) return "SPF";
  if (value.includes("v=dkim1") || name.includes("._domainkey")) return "DKIM";
  return "OTHER";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdminRow } = await admin.rpc("has_role", {
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdminRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: senderDomains, error: sdErr } = await admin
      .from("sender_domains")
      .select("id, domain, display_name, default_local_part, is_active")
      .order("display_name");
    if (sdErr) throw sdErr;

    if (!resendKey) {
      return new Response(JSON.stringify({
        error: "RESEND_API_KEY no configurado",
        domains: [],
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch list of Resend domains
    const listRes = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    if (!listRes.ok) {
      const txt = await listRes.text();
      return new Response(JSON.stringify({ error: `Resend API: ${listRes.status} ${txt}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const listJson = await listRes.json();
    const resendDomains: ResendDomain[] = listJson?.data ?? [];

    // For each Resend domain, fetch detail (records)
    const details: ResendDomain[] = await Promise.all(
      resendDomains.map(async (d) => {
        try {
          const r = await fetch(`https://api.resend.com/domains/${d.id}`, {
            headers: { Authorization: `Bearer ${resendKey}` },
          });
          if (!r.ok) return d;
          const j = await r.json();
          return { ...d, ...(j ?? {}) } as ResendDomain;
        } catch {
          return d;
        }
      })
    );

    const domainByName = new Map<string, ResendDomain>();
    for (const d of details) {
      if (d?.name) domainByName.set(d.name.toLowerCase(), d);
    }

    const results = (senderDomains ?? []).map((sd: any) => {
      const root = String(sd.domain).toLowerCase();
      // try exact match, then any parent (e.g. alertas.cliente.com -> cliente.com)
      let match = domainByName.get(root);
      if (!match) {
        for (const [name, d] of domainByName) {
          if (root === name || root.endsWith("." + name) || name.endsWith("." + root)) {
            match = d; break;
          }
        }
      }
      const records = match?.records ?? [];
      const buckets: Record<"SPF" | "DKIM" | "DMARC", DnsStatus> = {
        SPF: "missing", DKIM: "missing", DMARC: "missing",
      };
      const recordDetails: Record<string, ResendRecord[]> = { SPF: [], DKIM: [], DMARC: [] };
      for (const r of records) {
        const kind = classifyRecord(r);
        if (kind === "OTHER") continue;
        recordDetails[kind].push(r);
        const st = normalizeStatus(r.status);
        // worst-of priority: failed > pending > missing > verified
        const order: DnsStatus[] = ["verified", "missing", "pending", "failed"];
        if (order.indexOf(st) > order.indexOf(buckets[kind])) buckets[kind] = st;
      }
      const allOk = buckets.SPF === "verified" && buckets.DKIM === "verified" && buckets.DMARC === "verified";
      return {
        id: sd.id,
        domain: sd.domain,
        display_name: sd.display_name,
        default_local_part: sd.default_local_part,
        is_active: sd.is_active,
        resend_status: match?.status ?? "not_found",
        resend_region: match?.region ?? null,
        spf: buckets.SPF,
        dkim: buckets.DKIM,
        dmarc: buckets.DMARC,
        ready: allOk,
        records: recordDetails,
        matched_domain: match?.name ?? null,
      };
    });

    return new Response(JSON.stringify({ domains: results, checked_at: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
