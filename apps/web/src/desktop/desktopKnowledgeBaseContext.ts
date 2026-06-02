import {createContext, useContext} from "react";
import type {KnowledgeBase} from "@/service/knowledgeBaseApi.ts";

export type DesktopKnowledgeBaseContextValue = {
    kbs: KnowledgeBase[];
    loading: boolean;
    refresh: () => Promise<KnowledgeBase[]>;
};

export const DesktopKnowledgeBaseContext = createContext<DesktopKnowledgeBaseContextValue | null>(
    null
);

export function useDesktopKnowledgeBases(): DesktopKnowledgeBaseContextValue {
    const ctx = useContext(DesktopKnowledgeBaseContext);
    if (!ctx) {
        throw new Error("useDesktopKnowledgeBases must be used within DesktopKnowledgeBaseProvider");
    }
    return ctx;
}
