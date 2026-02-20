"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Translations = Record<string, Record<string, string>>;

type I18nContextType = {
    locale: string;
    setLocale: (locale: string) => void;
    t: (key: string, params?: Record<string, string>) => string;
    locales: { code: string; label: string }[];
};

const STORAGE_KEY = "vamo_locale";
const SUPPORTED_LOCALES = [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
    { code: "hi", label: "हिन्दी" },
    { code: "zh", label: "中文" },
];

const I18nContext = createContext<I18nContextType>({
    locale: "en",
    setLocale: () => {},
    t: (key) => key,
    locales: SUPPORTED_LOCALES,
});

// Import all locale files statically (Next.js will bundle these)
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import hi from "@/locales/hi.json";
import zh from "@/locales/zh.json";

const allTranslations: Record<string, Translations> = { en, es, fr, hi, zh };

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState("en");

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && allTranslations[stored]) {
            setLocaleState(stored);
        }
    }, []);

    const setLocale = useCallback((newLocale: string) => {
        if (allTranslations[newLocale]) {
            setLocaleState(newLocale);
            localStorage.setItem(STORAGE_KEY, newLocale);
            document.documentElement.lang = newLocale;
        }
    }, []);

    const t = useCallback(
        (key: string, params?: Record<string, string>): string => {
            // key format: "section.key" e.g. "nav.projects"
            const parts = key.split(".");
            if (parts.length !== 2) return key;
            const [section, field] = parts;

            const translations = allTranslations[locale] || allTranslations["en"];
            const sectionData = translations[section] as Record<string, string> | undefined;
            const value = sectionData?.[field];

            if (!value) {
                // Fallback to English
                const enSection = allTranslations["en"][section] as Record<string, string> | undefined;
                const enValue = enSection?.[field];
                if (!enValue) return key;
                return substituteParams(enValue, params);
            }

            return substituteParams(value, params);
        },
        [locale]
    );

    return (
        <I18nContext.Provider value={{ locale, setLocale, t, locales: SUPPORTED_LOCALES }}>
            {children}
        </I18nContext.Provider>
    );
}

function substituteParams(text: string, params?: Record<string, string>): string {
    if (!params) return text;
    let result = text;
    for (const [k, v] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
    return result;
}

export function useI18n() {
    return useContext(I18nContext);
}
