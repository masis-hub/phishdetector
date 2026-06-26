import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Bell, Database, Lock } from "lucide-react";

export default function Settings() {
  const { t } = useTranslation();
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{t("settings.title")}</h1>
        <p className="text-muted-foreground text-sm md:text-base">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-6">
        <Card className="p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{t("settings.compliance.title")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("settings.compliance.desc")}</p>
              <Button variant="outline">{t("settings.compliance.cta")}</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
              <Bell className="h-6 w-6 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{t("settings.notifications.title")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("settings.notifications.desc")}</p>
              <Button variant="outline">{t("settings.notifications.cta")}</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
              <Database className="h-6 w-6 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{t("settings.data.title")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("settings.data.desc")}</p>
              <Button variant="outline">{t("settings.data.cta")}</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">{t("settings.security.title")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("settings.security.desc")}</p>
              <Button variant="outline">{t("settings.security.cta")}</Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
