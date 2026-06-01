/**
 * manualChunks：模块路径含 /pages/ 时，用目录名作为 chunk 名。
 * 例：src/pages/chat/index.tsx → route-chat
 */
export function routeManualChunks(id: string): string | undefined {
    const normalized = id.replace(/\\/g, "/");
    const marker = "/pages/";
    const idx = normalized.indexOf(marker);
    if (idx === -1) return undefined;

    let segment = normalized.slice(idx + marker.length);
    segment = segment.replace(/\/index\.(tsx?|jsx?)$/, "").replace(/\.(tsx?|jsx?)$/, "");
    if (!segment) return undefined;

    return `route-${segment.replace(/\//g, "-")}`;
}
