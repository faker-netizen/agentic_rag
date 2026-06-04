import {apiBase, refreshAccessToken} from "@/service/authRefresh.ts";
import {getAccessToken} from "@/service/token.ts";
import {fetchSsePost} from "@/service/sseClient.ts";

export type RagSource = {id: number; title: string};

export type RagQueryResult = {
    answer: string;
    sources: RagSource[];
};

export type StreamRagQueryHandlers = {
    onSkill?: (p: {skillId: string; skillName: string}) => void;
    onStatus?: (p: {phase: string; label: string}) => void;
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
    options?: {signal?: AbortSignal; skillId?: string | null}
): Promise<void> {
    const url = `${apiBase()}/api/rag/query`;
    let answer = "";
    let sources: RagSource[] = [];
    const body: {query: string; knowledgeBaseId: number; skillId?: string} = {
        query: params.query.trim(),
        knowledgeBaseId: params.knowledgeBaseId,
    };
    if (options?.skillId) body.skillId = options.skillId;

    await fetchSsePost(
        url,
        body,
        (event, data) => {
            if (event === "skill")
                handlers.onSkill?.({
                    skillId: String(data.skillId ?? ""),
                    skillName: String(data.skillName ?? ""),
                });
            else if (event === "sources") {
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
            onStatus: handlers.onStatus,
        }
    );
}
