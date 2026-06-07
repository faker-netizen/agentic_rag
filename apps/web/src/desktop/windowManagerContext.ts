import {createContext} from "react";
import type {
    AppId,
    KnowledgeBaseWindowTarget,
    OpenAppOptions,
    WindowInstance,
    WindowMeta,
    WindowPosition,
} from "./types.ts";

export type WindowManagerContextValue = {
    windows: WindowInstance[];
    focusedId: string | null;
    openApp: (appId: AppId, meta?: WindowMeta, title?: string, options?: OpenAppOptions) => void;
    openChatPdf: (opts: {documentId?: number; title?: string}) => void;
    openKnowledgeBase: (kb: KnowledgeBaseWindowTarget) => void;
    closeWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    restoreWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    moveWindow: (id: string, position: WindowPosition) => void;
    clearOpeningAnimation: (id: string) => void;
    isAppOpen: (appId: AppId) => boolean;
    isKnowledgeBaseOpen: (kbId: number) => boolean;
};

export const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);
