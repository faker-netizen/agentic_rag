export type AppId = "chat" | "chatpdf" | "kb-finder";

export type WindowRect = {
    width: number;
    height: number;
};

export type WindowPosition = {
    x: number;
    y: number;
};

/** Dock 图标中心 → 窗口中心的开启动画起点（相对 window-layer） */
export type WindowOpenOrigin = {
    dockX: number;
    dockY: number;
};

export type WindowMeta = {
    knowledgeBaseId?: number;
    documentId?: number;
};

export type WindowInstance = {
    id: string;
    appId: AppId;
    title: string;
    zIndex: number;
    rect: WindowRect;
    position: WindowPosition;
    /** localStorage 持久化位置用的 key */
    positionKey: string;
    meta?: WindowMeta;
    minimized: boolean;
    openingFrom?: WindowOpenOrigin;
};

/** 窗口实例策略：可配置单例 / 多开 / 按 meta 去重 */
export type AppWindowPolicy = {
    /** 1 = 单例（如 RAG 对话）；undefined = 不限制数量 */
    maxInstances?: number;
    /** 同一 meta 字段仅一个窗口（如 documentId、knowledgeBaseId） */
    dedupeByMeta?: keyof WindowMeta;
};

export type DockAppDef = {
    id: AppId;
    label: string;
    available: boolean;
    defaultTitle: string;
    defaultSize?: WindowRect;
    windowPolicy?: AppWindowPolicy;
};

export type KnowledgeBaseWindowTarget = {
    id: number;
    name: string;
};

export type OpenAppOptions = {
    fromDock?: boolean;
    dockOrigin?: WindowOpenOrigin;
};
