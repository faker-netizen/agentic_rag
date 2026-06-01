import {apiBase, refreshAccessToken} from "@/service/authRefresh.ts";
import {getAccessToken} from "@/service/token.ts";
import {fetchSsePost} from "@/service/sseClient.ts";

export type RagSource = {id: number; title: string};

export type RagQueryResult = {
    answer: string;
    sources: RagSource[];
};

export type StreamRagQueryHandlers = {
    onSources: (p: {sources: RagSource[]}) => void;
    onToken: (p: {text: string}) => void;
    onError: (p: {message: string}) => void;
    onAborted?: (p: {stopped?: boolean}) => void;
    onDone: (p: RagQueryResult) => void;
};

/** POST /api/rag/query — SSE 流式 RAG 查询 */
export async function streamRagQuery(
    params: {query: string; knowledgeBaseId: number},
    handlers: StreamRagQueryHandlers,
    options?: {signal?: AbortSignal}
): Promise<void> {
    const url = `${apiBase()}/api/rag/query`;
    let answer = "";
    let sources: RagSource[] = [];

    await fetchSsePost(
        url,
        {query: params.query.trim(), knowledgeBaseId: params.knowledgeBaseId},
        (event, data) => {
            if (event === "sources") {
                sources = Array.isArray(data.sources) ? (data.sources as RagSource[]) : [];
                handlers.onSources({sources});
            } else if (event === "token") {
                const text = String(data.text ?? "");
                answer += text;
                handlers.onToken({text});
            } else if (event === "error") handlers.onError({message: String(data.message ?? "")});
            else if (event === "aborted") handlers.onAborted?.({stopped: Boolean(data.stopped)});
            else if (event === "done") {
                handlers.onDone({
                    answer: String(data.answer ?? answer),
                    sources: Array.isArray(data.sources) ? (data.sources as RagSource[]) : sources,
                });
            }
        },
        {
            getToken: getAccessToken,
            refreshToken: refreshAccessToken,
            signal: options?.signal,
        }
    );
}
