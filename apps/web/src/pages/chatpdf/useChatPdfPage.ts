import {useCallback, useEffect, useRef, useState} from "react";
import {message} from "antd";
import {
    fetchChatPdfSummary,
    streamChatPdfSummarize,
    uploadChatPdf,
} from "@/service/chatpdfApi.ts";
import type {PdfSummaryPayload} from "@/service/chatpdfTypes.ts";

export function useChatPdfPage(initialDocumentId: number | null | undefined) {
    const [documentId, setDocumentId] = useState<number | null>(() => initialDocumentId ?? null);
    const [summary, setSummary] = useState<PdfSummaryPayload | null>(null);
    const [summarizing, setSummarizing] = useState(false);
    const [statusLabel, setStatusLabel] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (documentId == null) return;
        let cancelled = false;
        void fetchChatPdfSummary(documentId).then((s) => {
            if (!cancelled) setSummary(s);
        });
        return () => {
            cancelled = true;
        };
    }, [documentId]);

    const onUpload = useCallback(async (file: File) => {
        try {
            const {documentId: id} = await uploadChatPdf(file, file.name);
            setSummary(null);
            setDocumentId(id);
            message.success("上传成功");
        } catch (e) {
            message.error(e instanceof Error ? e.message : "上传失败");
        }
    }, []);

    const onSummarize = useCallback(() => {
        if (documentId == null) return;
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        setSummarizing(true);
        setStatusLabel("开始生成…");
        void streamChatPdfSummarize(
            documentId,
            {
                onStatus: (label) => setStatusLabel(label),
                onSummary: (s) => setSummary(s),
                onError: (msg) => message.error(msg),
                onDone: () => setSummarizing(false),
            },
            ac.signal
        )
            .catch((e) => {
                if (ac.signal.aborted) return;
                message.error(e instanceof Error ? e.message : "总结失败");
            })
            .finally(() => {
                setSummarizing(false);
                setStatusLabel(null);
            });
    }, [documentId]);

    return {documentId, summary, summarizing, statusLabel, onUpload, onSummarize, setDocumentId};
}
