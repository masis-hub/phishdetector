import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Props {
  variant?: "default" | "ghost";
  compact?: boolean;
}

export function LanguageSwitcher({ variant = "ghost", compact = false }: Props) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language || "es").startsWith("en") ? "en" : "es";

  const change = (lng: "es" | "en") => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className="gap-2 rounded-xl"
          aria-label={t("common.language")}
        >
          <Globe className="h-4 w-4" />
          {!compact && (
            <span className="text-xs font-semibold uppercase tracking-wider">
              {current}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem onClick={() => change("es")} className="gap-2">
          <span className="text-base">🇪🇸</span> {t("common.spanish")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => change("en")} className="gap-2">
          <span className="text-base">🇺🇸</span> {t("common.english")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}