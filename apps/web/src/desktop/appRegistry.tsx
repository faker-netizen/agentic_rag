import {lazy, type ComponentType, type LazyExoticComponent} from "react";
import {FilePdfOutlined, FolderFilled, MessageOutlined} from "@ant-design/icons";
import type {AppId, AppWindowPolicy, DockAppDef} from "./types.ts";

/** 仅出现在 Dock 中的应用 */
export const DOCK_APPS: DockAppDef[] = [
    {
        id: "chat",
        label: "RAG 对话",
        available: true,
        defaultTitle: "RAG 对话",
        defaultSize: {width: 920, height: 620},
        windowPolicy: {maxInstances: 1},
    },
    {
        id: "chatpdf",
        label: "ChatPDF",
        available: true,
        defaultTitle: "ChatPDF",
        defaultSize: {width: 960, height: 640},
        windowPolicy: {dedupeByMeta: "documentId"},
    },
];

/** 所有可开窗应用（含桌面知识库 Finder） */
const WINDOW_APP_DEFS: DockAppDef[] = [
    ...DOCK_APPS,
    {
        id: "kb-finder",
        label: "知识库",
        available: true,
        defaultTitle: "知识库",
        defaultSize: {width: 720, height: 520},
        windowPolicy: {dedupeByMeta: "knowledgeBaseId"},
    },
];

export const DOCK_ICONS: Partial<Record<AppId, ComponentType<{className?: string}>>> = {
    chat: MessageOutlined,
    chatpdf: FilePdfOutlined,
    "kb-finder": FolderFilled,
};

export const APP_COMPONENTS: Partial<Record<AppId, LazyExoticComponent<ComponentType>>> = {
    chat: lazy(() => import("@/pages/chat/index.tsx")),
    chatpdf: lazy(() => import("@/pages/chatpdf/index.tsx")),
    "kb-finder": lazy(() => import("@/pages/knowledge-bases/KnowledgeBaseFinder.tsx")),
};

export function getDockApp(appId: AppId): DockAppDef | undefined {
    return WINDOW_APP_DEFS.find((a) => a.id === appId);
}

export function getWindowPolicy(appId: AppId): AppWindowPolicy {
    return getDockApp(appId)?.windowPolicy ?? {maxInstances: 1};
}
