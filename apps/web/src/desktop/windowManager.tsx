import {
    useCallback,
    useMemo,
    useReducer,
    type ReactNode,
} from "react";
import {getDockApp} from "./appRegistry.tsx";
import {WindowManagerContext, type WindowManagerContextValue} from "./windowManagerContext.ts";
import type {AppId, WindowInstance} from "./types.ts";

type WindowAction =
    | {type: "OPEN"; appId: AppId}
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

function windowReducer(state: WindowState, action: WindowAction): WindowState {
    switch (action.type) {
        case "OPEN": {
            const existing = state.windows.find((w) => w.appId === action.appId);
            if (existing) {
                return {
                    ...state,
                    nextZIndex: state.nextZIndex + 1,
                    focusedId: existing.id,
                    windows: state.windows.map((w) =>
                        w.id === existing.id ? {...w, zIndex: state.nextZIndex} : w
                    ),
                };
            }
            const def = getDockApp(action.appId);
            if (!def) return state;
            const id = `${action.appId}-${Date.now()}`;
            const win: WindowInstance = {
                id,
                appId: action.appId,
                title: def.defaultTitle,
                zIndex: state.nextZIndex,
                rect: def.defaultSize ?? {width: 800, height: 560},
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

    const value = useMemo(
        () => ({
            windows: state.windows,
            focusedId: state.focusedId,
            openApp,
            closeWindow,
            focusWindow,
            isAppOpen,
        }),
        [state.windows, state.focusedId, openApp, closeWindow, focusWindow, isAppOpen]
    );

    return <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>;
}
