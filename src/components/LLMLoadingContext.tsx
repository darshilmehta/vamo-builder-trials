"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface LLMLoadingContextType {
    isLLMLoading: boolean;
    startLLMCall: () => void;
    endLLMCall: () => void;
}

const LLMLoadingContext = createContext<LLMLoadingContextType>({
    isLLMLoading: false,
    startLLMCall: () => {},
    endLLMCall: () => {},
});

export function LLMLoadingProvider({ children }: { children: ReactNode }) {
    const [activeCount, setActiveCount] = useState(0);

    const startLLMCall = useCallback(() => {
        setActiveCount((c) => c + 1);
    }, []);

    const endLLMCall = useCallback(() => {
        setActiveCount((c) => Math.max(0, c - 1));
    }, []);

    return (
        <LLMLoadingContext.Provider
            value={{
                isLLMLoading: activeCount > 0,
                startLLMCall,
                endLLMCall,
            }}
        >
            {children}
        </LLMLoadingContext.Provider>
    );
}

export function useLLMLoading() {
    return useContext(LLMLoadingContext);
}
