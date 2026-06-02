import {useCallback, useEffect, useRef, useState} from "react";
import {Form, message} from "antd";
import type {FormInstance} from "antd";
import {listKnowledgeBases, type KnowledgeBase} from "@/service/knowledgeBaseApi.ts";
import {streamRagQuery, type RagSource} from "@/service/ragApi.ts";
import {RequestError} from "@/service/request.ts";

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
        let streamText = "";

        try {
            await streamRagQuery(
                {query, knowledgeBaseId},
                {
                    onSources: ({sources: s}) => setSources(s),
                    onToken: ({text}) => {
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
            if (!(e instanceof DOMException && e.name === "AbortError")) {
                message.error(errMsg(e));
            }
        } finally {
            setSubmitting(false);
            if (abortRef.current === ac) abortRef.current = null;
        }
    }, []);

    return {submitting, answer, sources, submit};
}
