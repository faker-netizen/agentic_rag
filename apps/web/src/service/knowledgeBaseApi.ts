import axios from "axios";
import http from "@/service/request.ts";
import {apiBase, refreshAccessToken} from "@/service/authRefresh.ts";
import {getAccessToken} from "@/service/token.ts";

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

function uploadErrorMessage(data: unknown, fallback: string): string {
    if (data && typeof data === "object") {
        const o = data as {error?: string; message?: string};
        if (o.error) return o.error;
        if (o.message) return o.message;
    }
    return fallback;
}

/** multipart 上传，不走 JSON 封装的 http.post；401 时 refresh 后重试一次 */
export async function uploadDocument(kbId: number, file: File, title?: string): Promise<number> {
    const titleVal = (title?.trim() || file.name).trim();

    const postOnce = () => {
        const form = new FormData();
        form.append("file", file);
        form.append("title", titleVal);
        const token = getAccessToken();
        return axios.post<{success: boolean; documentId: number; message?: string; error?: string}>(
            `${apiBase()}/api/knowledge-bases/${kbId}/upload`,
            form,
            {
                withCredentials: true,
                timeout: 120_000,
                headers: token ? {Authorization: `Bearer ${token}`} : {},
            }
        );
    };

    const parse = (data: {success?: boolean; documentId?: number; message?: string; error?: string}) => {
        if (!data?.success || data.documentId == null) {
            throw new Error(uploadErrorMessage(data, "上传失败"));
        }
        return data.documentId;
    };

    try {
        const res = await postOnce();
        return parse(res.data);
    } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 401) {
            const ok = await refreshAccessToken();
            if (!ok) throw new Error("登录已过期，请重新登录");
            const res = await postOnce();
            return parse(res.data);
        }
        if (axios.isAxiosError(e)) {
            throw new Error(uploadErrorMessage(e.response?.data, e.message || "上传失败"));
        }
        throw e;
    }
}
