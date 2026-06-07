import {getDockApp, getWindowPolicy} from "./appRegistry.tsx";
import {
    buildPositionKey,
    defaultWindowPosition,
    loadWindowPosition,
} from "./windowPositionStorage.ts";
import type {
    AppId,
    OpenAppOptions,
    WindowInstance,
    WindowMeta,
    WindowOpenOrigin,
    WindowPosition,
} from "./types.ts";

export type WindowAction =
    | {
          type: "OPEN";
          appId: AppId;
          meta?: WindowMeta;
          title?: string;
          options?: OpenAppOptions;
          layerEl?: HTMLElement | null;
      }
    | {type: "CLOSE"; id: string}
    | {type: "MINIMIZE"; id: string}
    | {type: "RESTORE"; id: string}
    | {type: "FOCUS"; id: string}
    | {type: "MOVE"; id: string; position: WindowPosition}
    | {type: "CLEAR_OPENING"; id: string};

export type WindowState = {
    windows: WindowInstance[];
    nextZIndex: number;
    focusedId: string | null;
};

export const initialWindowState: WindowState = {
    windows: [],
    nextZIndex: 100,
    focusedId: null,
};

function findExistingWindow(
    windows: WindowInstance[],
    appId: AppId,
    meta?: WindowMeta
): WindowInstance | undefined {
    const policy = getWindowPolicy(appId);
    if (policy.dedupeByMeta != null && meta?.[policy.dedupeByMeta] != null) {
        const key = meta[policy.dedupeByMeta];
        return windows.find(
            (w) => w.appId === appId && w.meta?.[policy.dedupeByMeta!] === key
        );
    }
    if (policy.maxInstances === 1) {
        return windows.find((w) => w.appId === appId);
    }
    return undefined;
}

function buildWindowId(appId: AppId, meta?: WindowMeta): string {
    if (appId === "kb-finder" && meta?.knowledgeBaseId != null) {
        return `kb-finder-${meta.knowledgeBaseId}`;
    }
    if (appId === "chatpdf" && meta?.documentId != null) {
        return `chatpdf-${meta.documentId}`;
    }
    return `${appId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type ResolvePositionInput = {
    appId: AppId;
    id: string;
    meta?: WindowMeta;
    rect: WindowInstance["rect"];
    cascadeIndex: number;
    layerEl?: HTMLElement | null;
};

function resolvePosition(input: ResolvePositionInput): WindowPosition {
    const positionKey = buildPositionKey(input.appId, input.id, input.meta);
    return (
        loadWindowPosition(positionKey) ??
        defaultWindowPosition(input.rect, input.cascadeIndex, input.layerEl)
    );
}

function bumpZIndex(state: WindowState, id: string): WindowState {
    return {
        ...state,
        nextZIndex: state.nextZIndex + 1,
        focusedId: id,
        windows: state.windows.map((w) =>
            w.id === id ? {...w, zIndex: state.nextZIndex} : w
        ),
    };
}

function activateExisting(
    state: WindowState,
    existing: WindowInstance,
    title?: string,
    openingFrom?: WindowOpenOrigin
): WindowState {
    const nextZ = state.nextZIndex + 1;
    return {
        ...state,
        nextZIndex: nextZ,
        focusedId: existing.id,
        windows: state.windows.map((w) =>
            w.id === existing.id
                ? {
                      ...w,
                      zIndex: nextZ,
                      title: title ?? w.title,
                      minimized: false,
                      openingFrom: w.minimized ? openingFrom : undefined,
                  }
                : w
        ),
    };
}

function reduceOpen(state: WindowState, action: Extract<WindowAction, {type: "OPEN"}>): WindowState {
    const existing = findExistingWindow(state.windows, action.appId, action.meta);
    const openingFrom = action.options?.fromDock ? action.options.dockOrigin : undefined;
    if (existing) {
        return activateExisting(state, existing, action.title, openingFrom);
    }

    const def = getDockApp(action.appId);
    if (!def) return state;

    const id = buildWindowId(action.appId, action.meta);
    const rect = def.defaultSize ?? {width: 800, height: 560};
    const positionKey = buildPositionKey(action.appId, id, action.meta);
    const visibleCount = state.windows.filter((w) => !w.minimized).length;
    const position = resolvePosition({
        appId: action.appId,
        id,
        meta: action.meta,
        rect,
        cascadeIndex: visibleCount,
        layerEl: action.layerEl,
    });

    const win: WindowInstance = {
        id,
        appId: action.appId,
        title: action.title ?? def.defaultTitle,
        zIndex: state.nextZIndex,
        rect,
        position,
        positionKey,
        meta: action.meta,
        minimized: false,
        openingFrom,
    };
    return {
        windows: [...state.windows, win],
        nextZIndex: state.nextZIndex + 1,
        focusedId: id,
    };
}

export function windowReducer(state: WindowState, action: WindowAction): WindowState {
    switch (action.type) {
        case "OPEN":
            return reduceOpen(state, action);
        case "CLOSE": {
            const next = state.windows.filter((w) => w.id !== action.id);
            const focusedId =
                state.focusedId === action.id ? (next.at(-1)?.id ?? null) : state.focusedId;
            return {...state, windows: next, focusedId};
        }
        case "MINIMIZE": {
            if (!state.windows.some((w) => w.id === action.id)) return state;
            const focusedId = state.focusedId === action.id ? null : state.focusedId;
            return {
                ...state,
                focusedId,
                windows: state.windows.map((w) =>
                    w.id === action.id ? {...w, minimized: true, openingFrom: undefined} : w
                ),
            };
        }
        case "RESTORE":
            if (!state.windows.some((w) => w.id === action.id)) return state;
            return bumpZIndex(
                {
                    ...state,
                    windows: state.windows.map((w) =>
                        w.id === action.id
                            ? {...w, minimized: false, openingFrom: undefined}
                            : w
                    ),
                },
                action.id
            );
        case "FOCUS":
            if (!state.windows.some((w) => w.id === action.id)) return state;
            return bumpZIndex(state, action.id);
        case "MOVE":
            if (!state.windows.some((w) => w.id === action.id)) return state;
            return {
                ...state,
                windows: state.windows.map((w) =>
                    w.id === action.id ? {...w, position: action.position} : w
                ),
            };
        case "CLEAR_OPENING":
            return {
                ...state,
                windows: state.windows.map((w) =>
                    w.id === action.id ? {...w, openingFrom: undefined} : w
                ),
            };
        default:
            return state;
    }
}
