import {memo} from "react";
import MarkdownContent from "./index.tsx";
import {StreamingPlainContent, type StreamingPlainHandle} from "./StreamingPlainContent.tsx";

type AssistantMessageBodyProps = {
    content: string;
    streaming?: boolean;
    streamRef?: React.RefObject<StreamingPlainHandle | null>;
    onStreamChunk?: () => void;
};

/**
 * 助手消息正文：流式用 imperative DOM 追加；结束后一次性 Markdown。
 */
export const AssistantMessageBody = memo(function AssistantMessageBody({
    content,
    streaming,
    streamRef,
    onStreamChunk,
}: AssistantMessageBodyProps) {
    if (streaming && streamRef) {
        return <StreamingPlainContent ref={streamRef} onAppend={onStreamChunk} />;
    }
    return <MarkdownContent content={content} />;
});
