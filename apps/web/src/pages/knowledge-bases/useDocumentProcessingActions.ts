import {useCallback, useRef} from "react";
import {message} from "antd";
import {
    requestDocumentIndex,
    requestDocumentSummarize,
    type KnowledgeBaseDocument,
} from "@/service/knowledgeBaseApi.ts";
import {RequestError} from "@/service/request.ts";
import {DOCUMENT_JOB_POLL_MS} from "@/service/documentJobConstants.ts";

const POLL_MAX_MS = 60_000;

function errText(e: unknown): string {
    return e instanceof RequestError ? e.message : "操作失败";
}

type UseDocumentProcessingActionsParams = {
    kbId: number | null;
    onRefresh: (options?: {silent?: boolean}) => Promise<void>;
};

export function useDocumentProcessingActions({kbId, onRefresh}: UseDocumentProcessingActionsParams) {
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPoll = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const startPoll = useCallback(() => {
        stopPoll();
        const started = Date.now();
        pollRef.current = setInterval(() => {
            if (Date.now() - started > POLL_MAX_MS) {
                stopPoll();
                return;
            }
            void onRefresh({silent: true});
        }, DOCUMENT_JOB_POLL_MS);
    }, [onRefresh, stopPoll]);

    const onSummarize = useCallback(
        async (doc: KnowledgeBaseDocument) => {
            if (kbId == null) return;
            try {
                await requestDocumentSummarize(kbId, doc.id);
                message.success("已开始生成摘要");
                await onRefresh();
                startPoll();
            } catch (e) {
                message.error(errText(e));
            }
        },
        [kbId, onRefresh, startPoll]
    );

    const onIndex = useCallback(
        async (doc: KnowledgeBaseDocument) => {
            if (kbId == null) return;
            try {
                await requestDocumentIndex(kbId, doc.id);
                message.success("已开始建立检索索引");
                await onRefresh();
                startPoll();
            } catch (e) {
                message.error(errText(e));
            }
        },
        [kbId, onRefresh, startPoll]
    );

    return {onSummarize, onIndex, stopPoll};
}
