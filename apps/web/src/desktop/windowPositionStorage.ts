import type {AppId, WindowMeta, WindowPosition, WindowRect} from "./types.ts";
import {getWindowPolicy} from "./appRegistry.tsx";

const STORAGE_KEY = "d2c-desktop-window-positions";

type PositionMap = Record<string, WindowPosition>;

function readMap(): PositionMap {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) return {};
        return parsed as PositionMap;
    } catch {
        return {};
    }
}

function writeMap(map: PositionMap): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function buildPositionKey(
    appId: AppId,
    windowId: string,
    meta?: WindowMeta
): string {
    const policy = getWindowPolicy(appId);
    if (policy.maxInstances === 1) return appId;
    if (policy.dedupeByMeta != null && meta?.[policy.dedupeByMeta] != null) {
        return `${appId}:${String(meta[policy.dedupeByMeta])}`;
    }
    return windowId;
}

export function loadWindowPosition(key: string): WindowPosition | null {
    const pos = readMap()[key];
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") return null;
    return pos;
}

export function saveWindowPosition(key: string, position: WindowPosition): void {
    const map = readMap();
    map[key] = position;
    writeMap(map);
}

export function defaultWindowPosition(
    rect: WindowRect,
    cascadeIndex: number,
    layerEl?: HTMLElement | null
): WindowPosition {
    const layerRect = layerEl?.getBoundingClientRect();
    const layerW = layerRect?.width ?? window.innerWidth;
    const layerH = layerRect?.height ?? window.innerHeight - 116;
    const offset = cascadeIndex * 28;
    const x = (layerW - rect.width) / 2 + offset;
    const y = (layerH - rect.height) / 2 + offset;
    return {
        x: Math.max(12, Math.round(x)),
        y: Math.max(12, Math.round(y)),
    };
}
