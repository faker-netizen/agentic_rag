import {lazy, type ComponentType, type LazyExoticComponent} from "react";
import {FilePdfOutlined, MessageOutlined} from "@ant-design/icons";
import type {AppId, DockAppDef} from "./types.ts";

export const DOCK_APPS: DockAppDef[] = [
    {
        id: "chat",
        label: "RAG 对话",
        available: true,
        defaultTitle: "RAG 对话",
        defaultSize: {width: 920, height: 620},
    },
    {
        id: "chatpdf",
        label: "ChatPDF",
        available: false,
        defaultTitle: "ChatPDF",
        defaultSize: {width: 960, height: 640},
    },
];

export const DOCK_ICONS: Record<AppId, ComponentType<{className?: string}>> = {
    chat: MessageOutlined,
    chatpdf: FilePdfOutlined,
};

export const APP_COMPONENTS: Partial<Record<AppId, LazyExoticComponent<ComponentType>>> = {
    chat: lazy(() => import("@/pages/chat/index.tsx")),
};

export function getDockApp(appId: AppId): DockAppDef | undefined {
    return DOCK_APPS.find((a) => a.id === appId);
}
