import type {AppId, OpenAppOptions} from "./types.ts";

export function getLayerElement(): HTMLElement | null {
    return document.querySelector(".window-layer");
}

export function getDockOrigin(appId: AppId): OpenAppOptions["dockOrigin"] {
    const btn = document.querySelector(`[data-dock-app="${appId}"]`);
    const layer = getLayerElement();
    if (!btn || !layer) return undefined;
    const btnRect = btn.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    return {
        dockX: btnRect.left + btnRect.width / 2 - layerRect.left,
        dockY: btnRect.top + btnRect.height / 2 - layerRect.top,
    };
}
