import {createContext} from "react";
import type {AppId, KnowledgeBaseWindowTarget, WindowInstance} from "./types.ts";

export type WindowManagerContextValue = {
    windows: WindowInstance[];
    focusedId: string | null;
    openApp: (appId: AppId) => void;
    openKnowledgeBase: (kb: KnowledgeBaseWindowTarget) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    isAppOpen: (appId: AppId) => boolean;
    isKnowledgeBaseOpen: (kbId: number) => boolean;
};

export const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);
