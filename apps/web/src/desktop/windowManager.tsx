import {
    useCallback,
    useMemo,
    useReducer,
    type ReactNode,
} from "react";
import {getDockApp} from "./appRegistry.tsx";
import {WindowManagerContext, type WindowManagerContextValue} from "./windowManagerContext.ts";
import type {AppId, KnowledgeBaseWindowTarget, WindowInstance, WindowMeta} from "./types.ts";

type WindowAction =
    | {type: "OPEN"; appId: AppId; meta?: WindowMeta; title?: string}
    | {type: "CLOSE"; id: string}
    | {type: "FOCUS"; id: string};

type WindowState = {
    windows: WindowInstance[];
    nextZIndex: number;
    focusedId: string | null;
};

const initialState: WindowState = {
    windows: [],
    nextZIndex: 100,
    focusedId: null,
};

function findExistingWindow(windows: WindowInstance[], appId: AppId, meta?: WindowMeta): WindowInstance | undefined {
    if (appId === "kb-finder" && meta?.knowledgeBaseId != null) {
        return windows.find(
            (w) => w.appId === "kb-finder" && w.meta?.knowledgeBaseId === meta.knowledgeBaseId
        );
    }
    return windows.find((w) => w.appId === appId);
}

function windowReducer(state: WindowState, action: WindowAction): WindowState {
    switch (action.type) {
        case "OPEN": {
            const existing = findExistingWindow(state.windows, action.appId, action.meta);
            if (existing) {
                return {
                    ...state,
                    nextZIndex: state.nextZIndex + 1,
                    focusedId: existing.id,
                    windows: state.windows.map((w) =>
                        w.id === existing.id
                            ? {
                                  ...w,
                                  zIndex: state.nextZIndex,
                                  title: action.title ?? w.title,
                              }
                            : w
                    ),
                };
            }
            const def = getDockApp(action.appId);
            if (!def) return state;
            const id =
                action.appId === "kb-finder" && action.meta?.knowledgeBaseId != null
                    ? `kb-finder-${action.meta.knowledgeBaseId}`
                    : `${action.appId}-${Date.now()}`;
            const win: WindowInstance = {
                id,
                appId: action.appId,
                title: action.title ?? def.defaultTitle,
                zIndex: state.nextZIndex,
                rect: def.defaultSize ?? {width: 800, height: 560},
                meta: action.meta,
            };
            return {
                windows: [...state.windows, win],
                nextZIndex: state.nextZIndex + 1,
                focusedId: id,
            };
        }
        case "CLOSE": {
            const next = state.windows.filter((w) => w.id !== action.id);
            const focusedId =
                state.focusedId === action.id ? (next.at(-1)?.id ?? null) : state.focusedId;
            return {...state, windows: next, focusedId};
        }
        case "FOCUS":
            if (!state.windows.some((w) => w.id === action.id)) return state;
            return {
                ...state,
                nextZIndex: state.nextZIndex + 1,
                focusedId: action.id,
                windows: state.windows.map((w) =>
                    w.id === action.id ? {...w, zIndex: state.nextZIndex} : w
                ),
            };
        default:
            return state;
    }
}

export function WindowManagerProvider({children}: {children: ReactNode}) {
    const [state, dispatch] = useReducer(windowReducer, initialState);

    const openApp = useCallback((appId: AppId) => {
        dispatch({type: "OPEN", appId});
    }, []);

    const openKnowledgeBase = useCallback((kb: KnowledgeBaseWindowTarget) => {
        dispatch({
            type: "OPEN",
            appId: "kb-finder",
            meta: {knowledgeBaseId: kb.id},
            title: kb.name,
        });
    }, []);

    const closeWindow = useCallback((id: string) => {
        dispatch({type: "CLOSE", id});
    }, []);

    const focusWindow = useCallback((id: string) => {
        dispatch({type: "FOCUS", id});
    }, []);

    const isAppOpen = useCallback(
        (appId: AppId) => state.windows.some((w) => w.appId === appId),
        [state.windows]
    );

    const isKnowledgeBaseOpen = useCallback(
        (kbId: number) =>
            state.windows.some(
                (w) => w.appId === "kb-finder" && w.meta?.knowledgeBaseId === kbId
            ),
        [state.windows]
    );

    const value = useMemo(
        (): WindowManagerContextValue => ({
            windows: state.windows,
            focusedId: state.focusedId,
            openApp,
            openKnowledgeBase,
            closeWindow,
            focusWindow,
            isAppOpen,
            isKnowledgeBaseOpen,
        }),
        [
            state.windows,
            state.focusedId,
            openApp,
            openKnowledgeBase,
            closeWindow,
            focusWindow,
            isAppOpen,
            isKnowledgeBaseOpen,
        ]
    );

    return <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>;
}
