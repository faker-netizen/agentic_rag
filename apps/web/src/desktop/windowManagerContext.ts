import {createContext} from "react";
import type {AppId, WindowInstance} from "./types.ts";

export type WindowManagerContextValue = {
    windows: WindowInstance[];
    focusedId: string | null;
    openApp: (appId: AppId) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    isAppOpen: (appId: AppId) => boolean;
};

export const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);
