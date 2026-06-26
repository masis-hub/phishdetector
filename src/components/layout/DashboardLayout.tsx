import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Mail, BarChart3, Settings, Users, FileText, LogOut, Building2, Menu, X, ChevronRight, ClipboardCheck, ShieldAlert, ShieldCheck, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import techsecureLogo from "@/assets/techsecure-logo.png";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { User } from "@supabase/supabase-js";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { withTimeout } from "@/lib/asyncTimeout";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { key: "panel", href: "/dashboard", icon: LayoutDashboard },
  { key: "campaigns", href: "/campaigns", icon: Mail },
  { key: "analytics", href: "/analytics", icon: BarChart3 },
  { key: "templates", href: "/templates", icon: FileText },
  { key: "reports", href: "/reports", icon: Building2 },
  { key: "plans", href: "/mitigation", icon: ClipboardCheck },
  { key: "security", href: "/security", icon: ShieldAlert },
  { key: "users", href: "/users", icon: Users },
  { key: "settings", href: "/settings", icon: Settings },
];

const adminNavItem = { key: "access", href: "/admin/access", icon: ShieldCheck, label: "Accesos y roles" };
const adminSenderDomainsItem = { key: "sender-domains", href: "/admin/sender-domains", icon: Globe, label: "Dominios remitentes" };

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const isAdmin = useIsAdmin();

  useEffect(() => {
    let active = true;

    withTimeout(supabase.auth.getSession(), 5000, "layout-session-timeout")
      .then(({ data: { session } }) => {
        if (!active) return;
        setUser(session?.user ?? null);
        setAuthReady(true);
        if (!session) {
          navigate("/auth", { replace: true });
        } else {
          loadAvatar(session.user.id);
        }
      })
      .catch((error) => {
        console.warn("[DashboardLayout] getSession timeout/error", error);
        if (active) {
          setAuthReady(true);
          if (!(error instanceof Error) || !error.message.includes("timeout")) {
            navigate("/auth", { replace: true });
          }
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setAuthReady(true);
        if (!session) {
          navigate("/auth", { replace: true });
        } else {
          loadAvatar(session.user.id);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const loadAvatar = async (userId: string) => {
    try {
      const { data } = await withTimeout(
        supabase.from("profiles").select("avatar_url, full_name").eq("id", userId).maybeSingle(),
        5000,
        "avatar-load-timeout",
      );
      if (data?.avatar_url) setProfileUrl(data.avatar_url);
    } catch (error) {
      console.warn("[DashboardLayout] avatar load skipped", error);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Sesión cerrada correctamente",
      });
      navigate("/");
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <img src={techsecureLogo} alt="PhishDetector" className="h-7 w-7" />
            <span className="text-lg font-bold text-gradient">PhishDetector</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher compact />
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[272px] bg-card/95 backdrop-blur-xl border-r border-border/50 transform transition-transform duration-300 ease-out",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-[72px] items-center gap-3 border-b border-border/50 px-6">
            <div className="relative">
              <img src={techsecureLogo} alt="PhishDetector" className="h-10 w-10" />
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gradient tracking-tight">PhishDetector</span>
              <span className="text-[10px] font-medium text-muted-foreground/70 tracking-wide uppercase">powered by Techsecure AI</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5 px-3 py-5">
            <div className="flex items-center justify-between px-3 mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {t("nav.menu")}
              </p>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <LanguageSwitcher compact />
              </div>
            </div>
            {[
              ...navigation,
              ...(isAdmin ? [adminNavItem, adminSenderDomainsItem] : []),
            ].map((item) => {
              const isActive = location.pathname === item.href;
              const label: string = "label" in item && item.label
                ? (item.label as string)
                : (t(`nav.${item.key}`) as string);
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-[18px] w-[18px]", isActive ? "" : "group-hover:text-primary")} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-border/50 p-4 space-y-3">
            <div
              className="flex items-center gap-3 cursor-pointer rounded-xl p-2.5 -mx-0.5 hover:bg-muted transition-all duration-200"
              onClick={() => { navigate("/profile"); setSidebarOpen(false); }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm overflow-hidden">
                {profileUrl ? (
                  <img src={profileUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  user?.email?.[0].toUpperCase() || "U"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user?.user_metadata?.full_name || t("nav.user")}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[272px] pt-14 lg:pt-0">
        <main className="p-4 md:p-8 max-w-[1400px]">{children}</main>
      </div>
    </div>
  );
}
