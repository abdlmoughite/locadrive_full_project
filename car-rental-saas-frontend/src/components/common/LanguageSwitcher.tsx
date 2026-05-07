import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

import { supportedLanguages } from "@/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();

  return (
    <div
      aria-label={t("common.language")}
      className={cn("inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/80 px-2 py-2 shadow-sm", className)}
    >
      <Globe className="h-4 w-4 text-slate-500" />
      <div className="flex items-center gap-1">
        {supportedLanguages.map((language) => (
          <Button
            key={language}
            variant={i18n.language === language ? "primary" : "ghost"}
            size="sm"
            className="h-8 min-w-12 px-3 text-xs"
            onClick={() => {
              void i18n.changeLanguage(language);
            }}
          >
            {t(`languageNames.${language}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
