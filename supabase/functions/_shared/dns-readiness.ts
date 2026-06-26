// Shared DNS readiness check for sender domains.
// Uses the Resend API to confirm SPF, DKIM and DMARC are all "verified"
// before a campaign is allowed to launch.

const PLATFORM_DEFAULT_DOMAINS = new Set([
  "notify.techsecureai.com",
]);

export type DnsReadyResult =
  | { ready: true; missing: []; reason: null }
  | { ready: false; missing: Array<"SPF" | "DKIM" | "DMARC">; reason: string };

type ResendRecord = {
  record?: string; name?: string; type?: string; value?: string; status?: string;
};

function classify(r: ResendRecord): "SPF" | "DKIM" | "DMARC" | "OTHER" {
  const tag = (r.record ?? "").toUpperCase();
  if (tag === "SPF" || tag === "DKIM" || tag === "DMARC") return tag as any;
  const name = (r.name ?? "").toLowerCase();
  const value = (r.value ?? "").toLowerCase();
  if (name.startsWith("_dmarc")) return "DMARC";
  if (value.includes("v=spf1")) return "SPF";
  if (value.includes("v=dkim1") || name.includes("._domainkey")) return "DKIM";
  return "OTHER";
}

export async function checkDomainDnsReady(domain: string): Promise<DnsReadyResult> {
  const normalized = (domain || "").toLowerCase().trim();
  if (!normalized) {
    return { ready: false, missing: ["SPF", "DKIM", "DMARC"], reason: "EMPTY_DOMAIN" };
  }
  // Platform-managed verified domain — always allowed.
  if (PLATFORM_DEFAULT_DOMAINS.has(normalized)) {
    return { ready: true, missing: [], reason: null };
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return { ready: false, missing: ["SPF", "DKIM", "DMARC"], reason: "RESEND_NOT_CONFIGURED" };
  }

  try {
    const listRes = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    if (!listRes.ok) {
      return { ready: false, missing: ["SPF", "DKIM", "DMARC"], reason: `RESEND_LIST_${listRes.status}` };
    }
    const listJson = await listRes.json();
    const domains = (listJson?.data ?? []) as Array<{ id: string; name: string }>;

    let match = domains.find((d) => d.name?.toLowerCase() === normalized);
    if (!match) {
      match = domains.find((d) => {
        const n = d.name?.toLowerCase() ?? "";
        return normalized.endsWith("." + n) || n.endsWith("." + normalized);
      });
    }
    if (!match) {
      return { ready: false, missing: ["SPF", "DKIM", "DMARC"], reason: "DOMAIN_NOT_IN_RESEND" };
    }

    const detailRes = await fetch(`https://api.resend.com/domains/${match.id}`, {
      headers: { Authorization: `Bearer ${resendKey}` },
    });
    if (!detailRes.ok) {
      return { ready: false, missing: ["SPF", "DKIM", "DMARC"], reason: `RESEND_DETAIL_${detailRes.status}` };
    }
    const detail = await detailRes.json();
    const records: ResendRecord[] = detail?.records ?? [];

    const buckets: Record<"SPF" | "DKIM" | "DMARC", boolean> = {
      SPF: false, DKIM: false, DMARC: false,
    };
    for (const r of records) {
      const kind = classify(r);
      if (kind === "OTHER") continue;
      if ((r.status ?? "").toLowerCase() === "verified") buckets[kind] = true;
    }
    const missing = (["SPF", "DKIM", "DMARC"] as const).filter((k) => !buckets[k]);
    if (missing.length === 0) {
      return { ready: true, missing: [], reason: null };
    }
    return { ready: false, missing: [...missing], reason: "DNS_RECORDS_NOT_VERIFIED" };
  } catch (e: any) {
    return { ready: false, missing: ["SPF", "DKIM", "DMARC"], reason: `EXCEPTION:${e?.message ?? e}` };
  }
}
