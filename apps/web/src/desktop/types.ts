export type AppId = "chat" | "chatpdf" | "kb-finder";

export type WindowRect = {
    width: number;
    height: number;
};

export type WindowMeta = {
    knowledgeBaseId?: number;
};

export type WindowInstance = {
    id: string;
    appId: AppId;
    title: string;
    zIndex: number;
    rect: WindowRect;
    meta?: WindowMeta;
};

export type DockAppDef = {
    id: AppId;
    label: string;
    available: boolean;
    defaultTitle: string;
    defaultSize?: WindowRect;
};

export type KnowledgeBaseWindowTarget = {
    id: number;
    name: string;
};
