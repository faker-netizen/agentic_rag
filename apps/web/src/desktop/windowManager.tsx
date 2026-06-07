import {useCallback, useMemo, useReducer, type ReactNode} from "react";
import {saveWindowPosition} from "./windowPositionStorage.ts";
import {
    initialWindowState,
    windowReducer,
    type WindowAction,
} from "./windowManagerReducer.ts";
import {WindowManagerContext, type WindowManagerContextValue} from "./windowManagerContext.ts";
import {getDockOrigin, getLayerElement} from "./windowManagerUtils.ts";
import type {AppId, KnowledgeBaseWindowTarget, OpenAppOptions, WindowMeta, WindowPosition} from "./types.ts";

function useWindowActions(
    dispatch: React.Dispatch<WindowAction>,
    windows: WindowManagerContextValue["windows"]
) {
    const dispatchOpen = useCallback(
        (appId: AppId, meta?: WindowMeta, title?: string, options?: OpenAppOptions) => {
            dispatch({
                type: "OPEN",
                appId,
                meta,
                title,
                options,
                layerEl: getLayerElement(),
            });
        },
        [dispatch]
    );

    const openApp = useCallback(
        (appId: AppId, meta?: WindowMeta, title?: string, options?: OpenAppOptions) => {
            const dockOrigin = options?.fromDock ? getDockOrigin(appId) : undefined;
            dispatchOpen(appId, meta, title, {...options, dockOrigin});
        },
        [dispatchOpen]
    );

    const openChatPdf = useCallback(
        (opts: {documentId?: number; title?: string}) => {
            dispatchOpen(
                "chatpdf",
                opts.documentId != null ? {documentId: opts.documentId} : undefined,
                opts.title
            );
        },
        [dispatchOpen]
    );

    const openKnowledgeBase = useCallback(
        (kb: KnowledgeBaseWindowTarget) => {
            dispatchOpen("kb-finder", {knowledgeBaseId: kb.id}, kb.name);
        },
        [dispatchOpen]
    );

    const closeWindow = useCallback((id: string) => dispatch({type: "CLOSE", id}), [dispatch]);
    const minimizeWindow = useCallback((id: string) => dispatch({type: "MINIMIZE", id}), [dispatch]);
    const restoreWindow = useCallback((id: string) => dispatch({type: "RESTORE", id}), [dispatch]);
    const focusWindow = useCallback((id: string) => dispatch({type: "FOCUS", id}), [dispatch]);
    const clearOpeningAnimation = useCallback(
        (id: string) => dispatch({type: "CLEAR_OPENING", id}),
        [dispatch]
    );

    const moveWindow = useCallback(
        (id: string, position: WindowPosition) => {
            const win = windows.find((w) => w.id === id);
            if (win) saveWindowPosition(win.positionKey, position);
            dispatch({type: "MOVE", id, position});
        },
        [dispatch, windows]
    );

    return {
        openApp,
        openChatPdf,
        openKnowledgeBase,
        closeWindow,
        minimizeWindow,
        restoreWindow,
        focusWindow,
        moveWindow,
        clearOpeningAnimation,
    };
}

export function WindowManagerProvider({children}: {children: ReactNode}) {
    const [state, dispatch] = useReducer(windowReducer, initialWindowState);
    const actions = useWindowActions(dispatch, state.windows);

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
            ...actions,
            isAppOpen,
            isKnowledgeBaseOpen,
        }),
        [state.windows, state.focusedId, actions, isAppOpen, isKnowledgeBaseOpen]
    );

    return <WindowManagerContext.Provider value={value}>{children}</WindowManagerContext.Provider>;
}
