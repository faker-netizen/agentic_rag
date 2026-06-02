import {useRef} from "react";
import {message} from "antd";
import type {PendingChunkUploadView} from "@/service/knowledgeBaseApi.ts";

export function useResumeUploadInput(
    consumeResumePending: () => PendingChunkUploadView | null,
    resumePendingUpload: (file: File, pending: PendingChunkUploadView) => Promise<void>
) {
    const resumeInputRef = useRef<HTMLInputElement>(null);

    const onResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const pending = consumeResumePending();
        e.target.value = "";
        if (!file || !pending) return;
        void resumePendingUpload(file, pending)
            .then(() => message.success("上传成功"))
            .catch((err) => message.error(err instanceof Error ? err.message : "续传失败"));
    };

    return {resumeInputRef, onResumeFileChange};
}
