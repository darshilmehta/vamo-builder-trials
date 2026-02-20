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
    setLocale: () => { },
    t: (key) => key,
    locales: SUPPORTED_LOCALES,
});

// Only English is bundled eagerly — all other locales are lazy-loaded on demand.
// This removes ~15-20 kB of JSON from the initial JS payload for English users.
import en from "@/locales/en.json";

// Mutable cache — populated lazily as users switch language
const loadedTranslations: Record<string, Translations> = { en };

export function I18nProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState("en");
    const [, forceUpdate] = useState(0); // used to re-render after lazy load

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED_LOCALES.some((l) => l.code === stored)) {
            // Kick off the lazy load for the stored non-English locale
            void loadLocaleAndSet(stored);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadLocaleAndSet = useCallback(async (newLocale: string) => {
        if (!loadedTranslations[newLocale]) {
            try {
                const mod = await import(`@/locales/${newLocale}.json`);
                loadedTranslations[newLocale] = mod.default as Translations;
            } catch {
                // Locale file missing — fall back to English silently
                return;
            }
        }
        setLocaleState(newLocale);
        forceUpdate((n) => n + 1); // ensure re-render after dynamic import
        localStorage.setItem(STORAGE_KEY, newLocale);
        document.documentElement.lang = newLocale;
    }, []);

    const setLocale = useCallback((newLocale: string) => {
        void loadLocaleAndSet(newLocale);
    }, [loadLocaleAndSet]);

    const t = useCallback(
        (key: string, params?: Record<string, string>): string => {
            const parts = key.split(".");
            if (parts.length !== 2) return key;
            const [section, field] = parts;

            const translations = loadedTranslations[locale] || loadedTranslations["en"];
            const sectionData = translations[section] as Record<string, string> | undefined;
            const value = sectionData?.[field];

            if (!value) {
                const enSection = loadedTranslations["en"][section] as Record<string, string> | undefined;
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
