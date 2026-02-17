"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export function NavigationLoader() {
    const pathname = usePathname();
    const [isNavigating, setIsNavigating] = useState(false);
    const prevPathname = useRef(pathname);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // When pathname changes, navigation is complete — hide the loader
        if (prevPathname.current !== pathname) {
            prevPathname.current = pathname;
            setIsNavigating(false);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        }
    }, [pathname]);

    useEffect(() => {
        // Intercept all clicks on anchor elements and buttons inside links
        function handleClick(e: MouseEvent) {
            const target = e.target as HTMLElement;

            // Walk up the DOM to find an anchor tag
            const anchor = target.closest("a");
            if (!anchor) return;

            const href = anchor.getAttribute("href");
            if (!href) return;

            // Skip external links, hash links, and same-page links
            if (
                href.startsWith("http") ||
                href.startsWith("#") ||
                href.startsWith("mailto:") ||
                anchor.target === "_blank"
            ) {
                return;
            }

            // Skip if it's the same path
            if (href === pathname) return;

            // Show the navigation loader
            setIsNavigating(true);

            // Safety timeout: hide loader after 8s if navigation doesn't complete
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                setIsNavigating(false);
            }, 8000);
        }

        document.addEventListener("click", handleClick, true);
        return () => {
            document.removeEventListener("click", handleClick, true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [pathname]);

    if (!isNavigating) return null;

    return (
        <div className="navigation-loader-overlay">
            <div className="navigation-loader-content">
                <div className="navigation-loader-spinner">
                    <div className="navigation-loader-pineapple">🍍</div>
                    <div className="navigation-loader-ring" />
                </div>
                <div className="navigation-loader-dots">
                    <span className="navigation-loader-dot" />
                    <span className="navigation-loader-dot" />
                    <span className="navigation-loader-dot" />
                </div>
                <p className="navigation-loader-text">Loading...</p>
            </div>
        </div>
    );
}
