import {useCallback, useEffect, useRef, useState} from "react";
import {Form, message} from "antd";
import type {FormInstance} from "antd";
import {listKnowledgeBases, type KnowledgeBase} from "@/service/knowledgeBaseApi.ts";
import {streamRagQuery, type RagSource} from "@/service/ragApi.ts";
import {RequestError} from "@/service/request.ts";
import {isAbortError, streamErrText} from "@/pages/chat/chatUtils.ts";

function errMsg(e: unknown): string {
    return e instanceof RequestError ? e.message : "请求失败，请稍后重试";
}

export function useRagKnowledgeBases(form: FormInstance<{knowledgeBaseId: number; query: string}>) {
    const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
    const [loadingKbs, setLoadingKbs] = useState(false);

    const loadKbs = useCallback(async () => {
        setLoadingKbs(true);
        try {
            const list = await listKnowledgeBases();
            setKbs(list);
            const cur = form.getFieldValue("knowledgeBaseId");
            if (cur == null && list[0]) {
                form.setFieldValue("knowledgeBaseId", list[0].id);
            }
        } catch (e) {
            message.error(errMsg(e));
        } finally {
            setLoadingKbs(false);
        }
    }, [form]);

    useEffect(() => {
        void loadKbs();
    }, [loadKbs]);

    return {kbs, loadingKbs};
}

export function useRagQuery() {
    const abortRef = useRef<AbortController | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [answer, setAnswer] = useState("");
    const [sources, setSources] = useState<RagSource[]>([]);
    const [streamStatus, setStreamStatus] = useState<string | null>(null);

    useEffect(() => {
        return () => abortRef.current?.abort();
    }, []);

    const submit = useCallback(async (knowledgeBaseId: number, query: string) => {
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;

        setSubmitting(true);
        setAnswer("");
        setSources([]);
        setStreamStatus(null);
        let streamText = "";

        try {
            await streamRagQuery(
                {query, knowledgeBaseId},
                {
                    onStatus: ({label}) => setStreamStatus(label),
                    onSources: ({sources: s}) => setSources(s),
                    onToken: ({text}) => {
                        setStreamStatus(null);
                        streamText += text;
                        setAnswer(streamText);
                    },
                    onError: ({message: m}) => message.error(m),
                    onDone: ({answer: a, sources: s}) => {
                        setAnswer(a);
                        setSources(s);
                    },
                },
                {signal: ac.signal}
            );
        } catch (e) {
            if (!isAbortError(e)) {
                message.error(e instanceof RequestError ? errMsg(e) : streamErrText(e));
            }
            setStreamStatus(null);
        } finally {
            setSubmitting(false);
            if (abortRef.current === ac) abortRef.current = null;
        }
    }, []);

    return {submitting, answer, sources, streamStatus, submit};
}
