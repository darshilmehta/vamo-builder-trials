"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export function NavigationLoader() {
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const prevPathname = useRef(pathname);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Start loading on anchor click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const anchor = (e.target as HTMLElement).closest("a");
            if (!anchor) return;
            const href = anchor.getAttribute("href");
            if (!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return;
            if (href === pathname) return;
            setIsNavigating(true);
            setIsComplete(false);
        }

        document.addEventListener("click", handleClick, true);
        return () => document.removeEventListener("click", handleClick, true);
    }, [pathname]);

    // Complete loading when pathname changes
    useEffect(() => {
        if (prevPathname.current !== pathname) {
            prevPathname.current = pathname;
            if (isNavigating) {
                setIsComplete(true);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                    setIsNavigating(false);
                    setIsComplete(false);
                }, 400);
            }
        }
    }, [pathname, isNavigating]);

    // Safety timeout — clear after 5s max
    useEffect(() => {
        if (isNavigating && !isComplete) {
            const safetyTimeout = setTimeout(() => {
                setIsComplete(true);
                setTimeout(() => {
                    setIsNavigating(false);
                    setIsComplete(false);
                }, 400);
            }, 5000);
            return () => clearTimeout(safetyTimeout);
        }
    }, [isNavigating, isComplete]);

    if (!isNavigating) return null;

    return (
        <div
            className={`navigation-progress-bar ${isComplete ? "complete" : ""}`}
            role="progressbar"
            aria-label="Page loading"
        />
    );
}
