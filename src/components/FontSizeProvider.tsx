"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type FontSizeLevel = 0 | 1 | 2; // 0=small, 1=normal, 2=large
const FONT_SIZES = ["14px", "16px", "18px"];
const STORAGE_KEY = "vamo_font_size";

type FontSizeContextType = {
    level: FontSizeLevel;
    increase: () => void;
    decrease: () => void;
};

const FontSizeContext = createContext<FontSizeContextType>({
    level: 1,
    increase: () => {},
    decrease: () => {},
});

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
    const [level, setLevel] = useState<FontSizeLevel>(1);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
            const parsed = parseInt(stored);
            if (parsed >= 0 && parsed <= 2) {
                setLevel(parsed as FontSizeLevel);
                document.documentElement.style.fontSize = FONT_SIZES[parsed];
            }
        }
    }, []);

    const increase = useCallback(() => {
        setLevel((prev) => {
            const next = Math.min(prev + 1, 2) as FontSizeLevel;
            document.documentElement.style.fontSize = FONT_SIZES[next];
            localStorage.setItem(STORAGE_KEY, String(next));
            return next;
        });
    }, []);

    const decrease = useCallback(() => {
        setLevel((prev) => {
            const next = Math.max(prev - 1, 0) as FontSizeLevel;
            document.documentElement.style.fontSize = FONT_SIZES[next];
            localStorage.setItem(STORAGE_KEY, String(next));
            return next;
        });
    }, []);

    return (
        <FontSizeContext.Provider value={{ level, increase, decrease }}>
            {children}
        </FontSizeContext.Provider>
    );
}

export function useFontSize() {
    return useContext(FontSizeContext);
}
