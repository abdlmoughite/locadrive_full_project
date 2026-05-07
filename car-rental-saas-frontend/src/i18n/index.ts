import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import ar from "@/i18n/locales/ar.json";
import fr from "@/i18n/locales/fr.json";

export const LANGUAGE_STORAGE_KEY = "locadrive.language";
export const supportedLanguages = ["fr", "ar"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export function getLanguageDirection(language: string) {
  return language === "ar" ? "rtl" : "ltr";
}

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") {
    return "fr";
  }

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLanguage && supportedLanguages.includes(storedLanguage as SupportedLanguage)) {
    return storedLanguage as SupportedLanguage;
  }

  return "fr";
}

function applyDocumentLanguage(language: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = language;
  document.documentElement.dir = getLanguageDirection(language);
}

void i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    ar: { translation: ar },
  },
  lng: getInitialLanguage(),
  fallbackLng: "fr",
  supportedLngs: supportedLanguages,
  detection: {
    order: ["localStorage", "navigator"],
    lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    caches: ["localStorage"],
  },
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (language) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
  applyDocumentLanguage(language);
});

applyDocumentLanguage(i18n.language);

export default i18n;
