import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Sparkles, Check, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TechsecureWordmark } from "@/components/landing/TechsecureWordmark";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { withTimeout } from "@/lib/asyncTimeout";

// Field validators return stable error CODES; the UI translates them via i18n.
const validateEmailCode = (val: string): string | null => {
  const v = val.trim();
  if (v.length === 0) return "EMAIL_REQUIRED";
  if (v.length > 255) return "EMAIL_TOO_LONG";
  // Simple RFC 5322-ish check (matches zod's default)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "INVALID_EMAIL";
  return null;
};

const validatePasswordCode = (val: string): string | null => {
  if (val.length === 0) return "PASSWORD_REQUIRED";
  if (val.length < 8) return "PASSWORD_TOO_SHORT";
  if (val.length > 100) return "PASSWORD_TOO_LONG";
  return null;
};

function useFieldValidator(
  value: string,
  validator: (val: string) => string | null,
) {
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched) {
      setErrorCode(validator(value));
    }
  }, [value, touched, validator]);

  const validateNow = useCallback(() => {
    setTouched(true);
    const err = validator(value);
    setErrorCode(err);
    return err === null;
  }, [value, validator]);

  return { errorCode, touched, setTouched, validateNow };
}

type AuthMode = "login" | "forgot";

export default function Auth() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const emailField = useFieldValidator(email, validateEmailCode);
  const passwordField = useFieldValidator(password, validatePasswordCode);

  // Translate any error code (frontend or edge-function) through i18n.
  const tErr = (code: string | null | undefined) =>
    code ? t(`errors.${code}`, { defaultValue: t("errors.UNEXPECTED") }) : "";

  useEffect(() => {
    let active = true;

    withTimeout(supabase.auth.getSession(), 5000, "auth-session-timeout")
      .then(({ data: { session } }) => {
        if (active && session) navigate("/dashboard", { replace: true });
      })
      .catch((error) => console.warn("[Auth] getSession timeout/error", error));

    return () => {
      active = false;
    };
  }, [navigate]);

  const resetErrors = () => {
    emailField.setTouched(false);
    passwordField.setTouched(false);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetErrors();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = emailField.validateNow();
    if (!valid) return;

    setLoading(true);
    try {
			// Backend validation (defense-in-depth) — does not reveal whether
			// the account exists, only that the input shape is acceptable.
			const { data: vData, error: vError } = await supabase.functions.invoke(
				"validate-auth-input",
				{ body: { mode: "forgot", email: email.trim() } },
			);
			if (vError || !vData?.ok) {
				const emailCode: string | undefined = vData?.codes?.email;
				if (emailCode) emailField.setTouched(true);
				toast({
					title: t("auth.toast.invalidTitle"),
					description: emailCode ? tErr(emailCode) : t("auth.toast.invalidDesc"),
					variant: "destructive",
				});
				return;
			}

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
				// Never expose whether the email exists. Always show a generic confirmation.
				console.warn("[auth] reset error", error.message);
      }
			toast({
				title: t("auth.toast.resetSentTitle"),
				description: t("auth.toast.resetSentDesc"),
			});
			setMode("login");
    } catch {
      toast({ title: t("auth.toast.errorTitle"), description: t("errors.UNEXPECTED"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailValid = emailField.validateNow();
    const passwordValid = passwordField.validateNow();
    if (!emailValid || !passwordValid) return;

    setLoading(true);
    try {
			// Backend validation step (defense-in-depth).
			const { data: vData, error: vError } = await withTimeout(
				supabase.functions.invoke("validate-auth-input", {
					body: { mode: "login", email: email.trim(), password },
				}),
				8000,
				"auth-validation-timeout",
			);
			if (vError || !vData?.ok) {
				supabase.functions
					.invoke("log-auth-failure", {
						body: { email: email.trim(), reason: "invalid_input" },
					})
					.catch(() => undefined);
				const fieldCode: string | undefined =
					vData?.codes?.email || vData?.codes?.password;
				toast({
					title: t("auth.toast.invalidTitle"),
					description: fieldCode ? tErr(fieldCode) : t("auth.toast.invalidDesc"),
					variant: "destructive",
				});
				return;
			}

      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email: email.trim(), password }),
        12000,
        "auth-login-timeout",
      );
      if (error) {
				// Uniform message: never disclose whether the email or password is the failing field.
				console.warn("[auth] sign-in error", error.message);
				const isRateLimited = /rate|too many/i.test(error.message);
				const reason = isRateLimited
					? "rate_limited"
					: /invalid login credentials/i.test(error.message)
						? "invalid_credentials"
						: "unknown_error";
				supabase.functions
					.invoke("log-auth-failure", {
						body: { email: email.trim(), reason },
					})
					.catch(() => undefined);
        toast({
					title: t("auth.toast.loginFailTitle"),
					description: t(isRateLimited ? "errors.RATE_LIMITED" : "errors.INVALID_CREDENTIALS"),
          variant: "destructive",
        });
        return;
      }
      toast({ title: t("auth.toast.successTitle"), description: t("auth.toast.successDesc") });
      window.location.assign("/dashboard");
    } catch {
      toast({ title: t("auth.toast.errorTitle"), description: t("errors.UNEXPECTED"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full h-12 rounded-xl bg-muted border px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-muted/70 text-sm transition-all duration-200";

  const inputValid = "border-border focus:border-primary/60 focus:ring-4 focus:ring-primary/15";
  const inputInvalid = "border-destructive/60 focus:border-destructive focus:ring-4 focus:ring-destructive/15";

  const buildInputClasses = (hasError: boolean) =>
    `${inputBase} ${hasError ? inputInvalid : inputValid}`;

  return (
    <div
      className="min-h-screen flex relative overflow-hidden bg-background text-foreground selection:bg-primary/40 selection:text-primary-foreground"
      style={{
        fontFamily:
          "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <style>{`
        .phd-display { font-family: 'Space Grotesk', system-ui, sans-serif; letter-spacing: -0.025em; }
        .phd-glow-btn:hover { box-shadow: 0 12px 40px -8px hsl(var(--primary)/0.55), 0 0 0 1px hsl(var(--primary)/0.6) inset; transform: translateY(-1px); }
      `}</style>

      {/* Radial gradient backdrop (matches Landing) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-1/3 left-1/2 h-[900px] w-[1400px] -translate-x-1/2 rounded-full opacity-70"
          style={{
            background:
              "radial-gradient(closest-side, hsl(var(--primary)/0.30) 0%, hsl(224 76% 48%/0.20) 35%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(closest-side, hsl(187 92% 60%/0.18), transparent 70%)",
          }}
        />
        <svg className="absolute inset-0 h-full w-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-auth" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M48 0H0V48" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-auth)" />
        </svg>
      </div>

      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher compact />
      </div>

      {/* Left side - Login form */}
      <div className="relative z-10 w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[440px]">
          {/* Logo */}
          <a href="/" className="inline-flex items-center gap-2.5 mb-12">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[#1E3A8A] shadow-lg shadow-primary/30">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" strokeWidth={2.4} />
            </div>
            <span className="phd-display text-[18px] font-bold text-foreground">
              PhishDetector
            </span>
          </a>

          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1.5 mb-6">
            <Sparkles className="h-3 w-3 text-accent" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/70">
              {t("auth.badge")}
            </span>
          </div>

          <h1 className="phd-display text-4xl sm:text-5xl font-bold text-foreground leading-[1.05] mb-3">
            {mode === "login" ? (
              <>
                {t("auth.loginTitlePart1")} <span className="text-accent">{t("auth.loginTitlePart2")}</span>
              </>
            ) : (
              <>
                {t("auth.forgotTitlePart1")} <span className="text-accent">{t("auth.forgotTitlePart2")}</span>
              </>
            )}
          </h1>
          <p className="text-muted-foreground text-[15px] mb-10 leading-relaxed">
            {mode === "login" ? t("auth.loginSubtitle") : t("auth.forgotSubtitle")}
          </p>

          {mode === "forgot" ? (
            <form onSubmit={handleForgotPassword} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label className="text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {t("auth.emailLabel")}
                </label>
                <input
                  type="email"
                  placeholder="admin@techsecure.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => emailField.setTouched(true)}
                  maxLength={255}
                  className={buildInputClasses(!!emailField.errorCode)}
                  aria-invalid={!!emailField.errorCode}
                  aria-describedby={emailField.errorCode ? "email-error" : undefined}
                />
                {emailField.errorCode && (
                  <p id="email-error" className="flex items-center gap-1.5 text-[12px] text-destructive mt-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {tErr(emailField.errorCode)}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="phd-glow-btn w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.55)] transition-all duration-300 disabled:opacity-50"
              >
                {loading ? t("auth.loadingForgot") : t("auth.submitForgot")}
              </button>
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="flex items-center gap-1.5 text-sm text-accent hover:text-foreground mx-auto transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t("auth.backToLogin")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-5" noValidate>
              <div className="space-y-2">
                <label className="text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {t("auth.emailLabel")}
                </label>
                <input
                  type="email"
                  placeholder="admin@techsecure.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => emailField.setTouched(true)}
                  maxLength={255}
                  className={buildInputClasses(!!emailField.errorCode)}
                  aria-invalid={!!emailField.errorCode}
                  aria-describedby={emailField.errorCode ? "email-error" : undefined}
                />
                {emailField.errorCode && (
                  <p id="email-error" className="flex items-center gap-1.5 text-[12px] text-destructive mt-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {tErr(emailField.errorCode)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-muted-foreground/60 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    {t("auth.passwordLabel")}
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-[11px] text-accent hover:text-foreground transition-colors font-medium"
                  >
                    {t("auth.forgotLink")}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => passwordField.setTouched(true)}
                    maxLength={100}
                    className={`${buildInputClasses(!!passwordField.errorCode)} pr-12`}
                    aria-invalid={!!passwordField.errorCode}
                    aria-describedby={passwordField.errorCode ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordField.errorCode && (
                  <p id="password-error" className="flex items-center gap-1.5 text-[12px] text-destructive mt-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {tErr(passwordField.errorCode)}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="phd-glow-btn w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.55)] transition-all duration-300 disabled:opacity-50"
              >
                {loading ? t("auth.loadingLogin") : t("auth.submitLogin")}
              </button>

              <p className="text-[12px] text-muted-foreground/50 text-center pt-2">
                {t("auth.restrictedNote")}
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Right side - Info panel */}
      <div className="hidden lg:flex relative z-10 w-1/2 items-center justify-center p-12">
        <div
          className="w-full max-w-[480px] rounded-3xl p-10 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)",
            border: "1px solid hsl(var(--border))",
            boxShadow: "0 24px 60px -20px hsl(var(--primary)/0.25)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at top right, hsl(var(--primary)/0.18), transparent 60%)",
            }}
          />

          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-accent mb-5">
              {t("auth.side.eyebrow")}
            </p>
            <h2 className="phd-display text-3xl font-bold text-foreground leading-[1.1] mb-6">
              {t("auth.side.titlePart1")}{" "}
              <span className="text-accent">{t("auth.side.titlePart2")}</span>{" "}
              {t("auth.side.titlePart3")}
            </h2>
            <p className="text-muted-foreground text-[14px] leading-relaxed mb-10">
              {t("auth.side.body")}
            </p>

            <ul className="space-y-3.5 mb-10">
              {[
                t("auth.side.bullet1"),
                t("auth.side.bullet2"),
                t("auth.side.bullet3"),
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-accent">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-[13.5px] text-foreground/80">{item}</span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border">
              <div>
                <p className="phd-display text-2xl font-bold text-foreground tabular-nums">
                  73<span className="text-accent">%</span>
                </p>
                <p className="text-muted-foreground/60 text-[11px] mt-1 leading-tight">
                  {t("auth.side.stat1Label")}
                </p>
              </div>
              <div>
                <p className="phd-display text-2xl font-bold text-foreground tabular-nums">
                  500<span className="text-accent">+</span>
                </p>
                <p className="text-muted-foreground/60 text-[11px] mt-1 leading-tight">
                  {t("auth.side.stat2Label")}
                </p>
              </div>
              <div>
                <p className="phd-display text-2xl font-bold text-foreground tabular-nums">
                  24<span className="text-accent">/7</span>
                </p>
                <p className="text-muted-foreground/60 text-[11px] mt-1 leading-tight">
                  {t("auth.side.stat3Label")}
                </p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-border flex items-center justify-between">
              <TechsecureWordmark />
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
                {t("auth.side.by")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
