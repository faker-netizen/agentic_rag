export type AppId = "chat" | "chatpdf";

export type WindowRect = {
    width: number;
    height: number;
};

export type WindowInstance = {
    id: string;
    appId: AppId;
    title: string;
    zIndex: number;
    rect: WindowRect;
};

export type DockAppDef = {
    id: AppId;
    label: string;
    available: boolean;
    defaultTitle: string;
    defaultSize?: WindowRect;
};
