import axios from "axios";
import http from "@/service/request.ts";
import {getAccessToken} from "@/service/token.ts";

const baseURL = () => import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export type KnowledgeBase = {
    id: number;
    user_id: number;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
};

export type KnowledgeBaseDocument = {
    id: number;
    user_id: number;
    knowledge_base_id: number;
    title: string;
    file_path?: string | null;
    file_type?: string | null;
    created_at: string;
    updated_at: string;
};

export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
    const res = await http.get<{success: boolean; knowledgeBases: KnowledgeBase[]}>("/api/knowledge-bases");
    return res.knowledgeBases ?? [];
}

export async function createKnowledgeBase(name: string, description?: string): Promise<number> {
    const res = await http.post<{success: boolean; id: number}, {name: string; description?: string}>(
        "/api/knowledge-bases",
        {name, ...(description ? {description} : {})}
    );
    return res.id;
}

export async function deleteKnowledgeBase(kbId: number): Promise<void> {
    await http.delete<{success: boolean}>(`/api/knowledge-bases/${kbId}`);
}

export async function listDocuments(kbId: number): Promise<KnowledgeBaseDocument[]> {
    const res = await http.get<{success: boolean; documents: KnowledgeBaseDocument[]}>(
        `/api/knowledge-bases/${kbId}/documents`
    );
    return res.documents ?? [];
}

export async function deleteDocument(kbId: number, documentId: number): Promise<void> {
    await http.delete<{success: boolean}>(`/api/knowledge-bases/${kbId}/documents/${documentId}`);
}

/** multipart 上传，不走 JSON 封装的 http.post */
export async function uploadDocument(kbId: number, file: File, title?: string): Promise<number> {
    const form = new FormData();
    form.append("file", file);
    form.append("title", (title?.trim() || file.name).trim());
    const token = getAccessToken();
    const res = await axios.post<{success: boolean; documentId: number; message?: string}>(
        `${baseURL()}/api/knowledge-bases/${kbId}/upload`,
        form,
        {
            withCredentials: true,
            timeout: 120_000,
            headers: token ? {Authorization: `Bearer ${token}`} : {},
        }
    );
    if (!res.data?.success || res.data.documentId == null) {
        throw new Error(res.data?.message || "上传失败");
    }
    return res.data.documentId;
}
