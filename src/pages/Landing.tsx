import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  LineChart,
  ClipboardList,
  TrendingUp,
  Sparkles,
  Check,
  Mail,
  ExternalLink,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RiskChart } from "@/components/landing/RiskChart";
import { AnimatedCounter } from "@/components/landing/AnimatedCounter";
import { RequestDemoDialog } from "@/components/landing/RequestDemoDialog";
import { TechsecureWordmark } from "@/components/landing/TechsecureWordmark";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const Section = ({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section id={id} className={`py-[120px] ${className}`}>
    <div className="mx-auto max-w-6xl px-6 sm:px-10">{children}</div>
  </section>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-5">
    {children}
  </p>
);

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
  }, [navigate]);

  return (
    <div
      className="min-h-screen bg-background text-foreground selection:bg-primary/40 selection:text-primary-foreground"
      style={{
        fontFamily:
          "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <style>{`
        .phd-display { font-family: 'Space Grotesk', system-ui, sans-serif; letter-spacing: -0.025em; }
        .phd-glow-btn:hover { box-shadow: 0 12px 40px -8px hsl(var(--primary)/0.55), 0 0 0 1px hsl(var(--primary)/0.6) inset; transform: translateY(-1px); }
        .phd-card { background: linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%); border: 1px solid hsl(var(--border)); }
        .phd-card:hover { border-color: hsl(var(--primary) / 0.35); box-shadow: 0 24px 60px -20px hsl(var(--primary) / 0.25); }
      `}</style>

      {/* Radial gradient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-1/4 left-1/2 h-[900px] w-[1400px] -translate-x-1/2 rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--primary)/0.28) 0%, hsl(224 76% 48%/0.18) 35%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-[40%] left-0 h-[600px] w-[600px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(closest-side, hsl(187 92% 60%/0.18), transparent 70%)",
          }}
        />
        {/* faint grid */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M48 0H0V48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/70">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-6 sm:px-10">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#1E3A8A] shadow-lg shadow-primary/30">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" strokeWidth={2.4} />
            </div>
            <span className="phd-display text-[17px] font-bold text-foreground">
              PhishDetector
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-9 text-[13px] font-medium text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition-colors">
              {t("landing.nav.howItWorks")}
            </a>
            <a href="#simulation" className="hover:text-foreground transition-colors">
              {t("landing.nav.simulation")}
            </a>
            <a href="#capabilities" className="hover:text-foreground transition-colors">
              {t("landing.nav.capabilities")}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher compact />
            <button
              onClick={() => navigate("/auth")}
              className="hidden sm:inline-flex items-center text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg"
            >
              {t("common.login")}
            </button>
            <button
              onClick={() => setDemoOpen(true)}
              className="phd-glow-btn inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-all duration-300 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)]"
            >
              {t("common.requestDemo")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-24 pb-28 sm:pt-32 sm:pb-36">
        <div className="mx-auto max-w-6xl px-6 sm:px-10 grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 mb-8">
              <Sparkles className="h-3 w-3 text-accent" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t("landing.hero.badge")}
              </span>
            </div>

            <h1 className="phd-display text-[44px] sm:text-[56px] lg:text-[64px] leading-[1.02] font-bold text-foreground">
              {t("landing.hero.titlePart1")}{" "}
              <span className="text-accent">{t("landing.hero.titlePart2")}</span>{" "}
              {t("landing.hero.titlePart3")}
            </h1>

            <p className="mt-7 text-[17px] sm:text-[18px] leading-[1.65] text-muted-foreground max-w-xl">
              {t("landing.hero.subtitle")}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setDemoOpen(true)}
                className="phd-glow-btn inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-[14px] font-semibold text-primary-foreground transition-all duration-300 shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.55)]"
              >
                {t("landing.hero.ctaPrimary")}
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-6 py-4 text-[14px] font-semibold text-foreground hover:border-border hover:bg-muted/50 transition-all duration-300"
              >
                {t("landing.hero.ctaSecondary")}
              </a>
            </div>
          </motion.div>

          <RiskChart
            title={t("landing.hero.panel.title")}
            subtitle={t("landing.hero.panel.subtitle")}
            currentLabel={t("landing.hero.panel.current")}
            deltaLabel={t("landing.hero.panel.delta")}
          />
        </div>
      </section>

      {/* Credibility */}
      <Section>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="grid sm:grid-cols-3 gap-px rounded-2xl overflow-hidden bg-border border border-border"
        >
          {([1, 2, 3] as const).map((n) => {
            const value = parseInt(t(`landing.credibility.stat${n}Value`), 10);
            const suffix = t(`landing.credibility.stat${n}Suffix`);
            const label = t(`landing.credibility.stat${n}Label`);
            return (
              <div key={n} className="bg-background p-8 sm:p-10">
                <p className="phd-display text-5xl sm:text-6xl font-bold text-foreground">
                  <AnimatedCounter to={value} suffix={suffix} />
                </p>
                <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground max-w-[260px]">
                  {label}
                </p>
              </div>
            );
          })}
        </motion.div>
      </Section>

      {/* How it works */}
      <Section id="how">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="max-w-2xl mb-16"
        >
          <Eyebrow>{t("landing.how.eyebrow")}</Eyebrow>
          <h2 className="phd-display text-4xl sm:text-5xl font-bold text-foreground leading-[1.1]">
            {t("landing.how.title")}
          </h2>
          <p className="mt-5 text-[16px] text-muted-foreground leading-relaxed">
            {t("landing.how.subtitle")}
          </p>
        </motion.div>

        <div className="relative">
          {/* connecting line */}
          <div className="hidden md:block absolute top-12 left-[8%] right-[8%] h-px overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="h-full origin-left bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {[
              { Icon: LineChart, n: 1 },
              { Icon: ClipboardList, n: 2 },
              { Icon: TrendingUp, n: 3 },
            ].map(({ Icon, n }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="phd-card rounded-2xl p-7 transition-all duration-500 hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background mb-6 relative">
                  <Icon className="h-5 w-5 text-accent" strokeWidth={1.6} />
                  <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-md -z-10" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground/50 mb-2">
                  0{n}
                </p>
                <h3 className="phd-display text-xl font-bold text-foreground mb-3">
                  {t(`landing.how.step${n}Title`)}
                </h3>
                <p className="text-[14px] leading-relaxed text-muted-foreground">
                  {t(`landing.how.step${n}Desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* Simulation */}
      <Section id="simulation">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="grid lg:grid-cols-[1fr_1.1fr] gap-14 items-center"
        >
          <div>
            <Eyebrow>{t("landing.simulation.eyebrow")}</Eyebrow>
            <h2 className="phd-display text-4xl sm:text-5xl font-bold text-foreground leading-[1.1]">
              {t("landing.simulation.title")}
            </h2>
            <p className="mt-6 text-[16px] text-muted-foreground leading-[1.75]">
              {t("landing.simulation.body")}
            </p>
            <ul className="mt-8 space-y-3.5">
              {(["b1", "b2", "b3"] as const).map((k) => (
                <li key={k} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-accent">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-[14px] text-muted-foreground">
                    {t(`landing.simulation.bullets.${k}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* SOC-style mock panel */}
          <div className="phd-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/60">
                  {t("landing.simulation.panel.title")}
                </p>
                <span className="text-[10px] text-success/80">● {t("landing.simulation.panel.active")}</span>
              </div>
              {[
                { label: t("landing.simulation.panel.dept.finance"), v: 22, color: "#22D3EE" },
                { label: t("landing.simulation.panel.dept.operations"), v: 38, color: "#7C3AED" },
                { label: t("landing.simulation.panel.dept.hr"), v: 51, color: "#A78BFA" },
                { label: t("landing.simulation.panel.dept.it"), v: 14, color: "#34D399" },
                { label: t("landing.simulation.panel.dept.sales"), v: 44, color: "#7C3AED" },
              ].map((row, i) => (
                <div key={row.label} className="mb-3.5 last:mb-0">
                  <div className="flex justify-between text-[12px] text-muted-foreground mb-1.5">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-foreground">{row.v}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${row.v}%` }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                      style={{ background: `linear-gradient(90deg, ${row.color}, ${row.color}90)` }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </Section>

      {/* Capabilities */}
      <Section id="capabilities">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="max-w-2xl mb-14"
        >
          <Eyebrow>{t("landing.capabilities.eyebrow")}</Eyebrow>
          <h2 className="phd-display text-4xl sm:text-5xl font-bold text-foreground leading-[1.1]">
            {t("landing.capabilities.title")}
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(["simulation", "riskScore", "reports", "templates", "mitigation", "multitenant"] as const).map(
            (k, i) => (
              <motion.div
                key={k}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="phd-card rounded-2xl p-6 transition-all duration-500"
              >
                <div className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-primary/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                </div>
                <h3 className="phd-display text-[17px] font-bold text-foreground mb-2">
                  {t(`landing.capabilities.items.${k}.title`)}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                  {t(`landing.capabilities.items.${k}.desc`)}
                </p>
              </motion.div>
            )
          )}
        </div>
      </Section>

      {/* Final CTA */}
      <Section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl border border-border/60 p-12 sm:p-16 text-center"
          style={{
            background:
              "radial-gradient(ellipse at top, hsl(var(--primary)/0.35), hsl(224 76% 48%/0.15) 50%, hsl(var(--background)) 90%)",
          }}
        >
          <h2 className="phd-display mx-auto max-w-3xl text-3xl sm:text-5xl font-bold text-foreground leading-[1.1]">
            {t("landing.cta.title")}
          </h2>
          <p className="mt-6 mx-auto max-w-xl text-[16px] text-muted-foreground leading-relaxed">
            {t("landing.cta.subtitle")}
          </p>
          <button
            onClick={() => setDemoOpen(true)}
            className="phd-glow-btn mt-10 inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-4 text-[14px] font-semibold text-primary-foreground transition-all duration-300 shadow-[0_16px_40px_-8px_hsl(var(--primary)/0.6)]"
          >
            {t("landing.cta.button")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </Section>

      {/* Contact */}
      <Section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl border border-border/60 p-12 sm:p-16 text-center"
          style={{
            background:
              "radial-gradient(ellipse at top, hsl(var(--primary)/0.20), hsl(224 76% 48%/0.10) 50%, hsl(var(--background)) 90%)",
          }}
        >
          <Eyebrow>{t("landing.contact.eyebrow")}</Eyebrow>
          <h2 className="phd-display mx-auto max-w-3xl text-3xl sm:text-4xl font-bold text-foreground leading-[1.1]">
            {t("landing.contact.title")}
          </h2>
          <p className="mt-6 mx-auto max-w-xl text-[16px] text-muted-foreground leading-relaxed">
            {t("landing.contact.body")}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:info@techsecureai.com"
              className="phd-glow-btn inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-4 text-[14px] font-semibold text-primary-foreground transition-all duration-300 shadow-[0_16px_40px_-8px_hsl(var(--primary)/0.6)]"
            >
              <Mail className="h-4 w-4" />
              {t("landing.contact.button")}
            </a>
            <a
              href="https://www.techsecureai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-6 py-4 text-[14px] font-semibold text-foreground hover:border-border hover:bg-muted/50 transition-all duration-300"
            >
              <ExternalLink className="h-4 w-4" />
              {t("landing.contact.services")} www.techsecureai.com
            </a>
          </div>
        </motion.div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted">
        <div className="mx-auto max-w-6xl px-6 sm:px-10 py-14">
          <div className="grid sm:grid-cols-[1.4fr_1fr] gap-10 items-start">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#1E3A8A] shadow-lg shadow-primary/30">
                  <ShieldCheck className="h-4 w-4 text-primary-foreground" strokeWidth={2.4} />
                </div>
                <div className="leading-tight">
                  <div className="phd-display text-[17px] font-bold text-foreground">PhishDetector</div>
                  <a
                    href="https://www.techsecureai.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60 hover:text-accent transition-colors"
                  >
                    powered by Techsecure AI
                  </a>
                </div>
              </div>
              <TechsecureWordmark className="mt-5" />
              <p className="mt-4 text-[13px] text-muted-foreground/60 max-w-sm leading-relaxed">
                {t("landing.footer.tagline")} · {new Date().getFullYear()} © Techsecure AI.{" "}
                {t("landing.footer.rights")}
              </p>
            </div>
            <div className="flex sm:justify-end items-center gap-6 text-[13px] text-muted-foreground/70">
              <a href="#" className="hover:text-foreground transition-colors">
                {t("landing.footer.privacy")}
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                {t("landing.footer.terms")}
              </a>
              <a
                href="https://www.techsecureai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                {t("landing.footer.services")}
              </a>
              <LanguageSwitcher compact />
            </div>
          </div>
        </div>
      </footer>

      <RequestDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
