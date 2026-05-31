import {memo} from "react";
import {Tag, Typography} from "antd";
import {RobotOutlined, UserOutlined} from "@ant-design/icons";
import type {ChatMessage, ChatSource} from "@/service/chatApi.ts";
import MarkdownContent from "@/components/MarkdownContent";

const {Text} = Typography;

function parseSources(raw: unknown): ChatSource[] {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw as ChatSource[];
    if (typeof raw === "string") {
        try {
            const v = JSON.parse(raw) as unknown;
            return Array.isArray(v) ? (v as ChatSource[]) : [];
        } catch {
            return [];
        }
    }
    return [];
}

export type ChatMessageBubbleProps = {
    message: ChatMessage;
    isStreaming?: boolean;
    /** 流式阶段 rAF 节流后的正文 */
    streamDisplay?: string;
};

const ChatMessageBubble = memo(function ChatMessageBubble({
    message,
    isStreaming = false,
    streamDisplay,
}: ChatMessageBubbleProps) {
    const isUser = message.role === "user";
    const sources = message.role === "assistant" ? parseSources(message.sources_json) : [];
    const assistantContent = isStreaming ? (streamDisplay ?? "") : message.content;
    const showStreamCursor = isStreaming && !assistantContent.trim();

    return (
        <div className={`chat-bubble-wrap ${isUser ? "chat-bubble-wrap--user" : "chat-bubble-wrap--assistant"}`}>
            <div className={`chat-bubble-row ${isUser ? "chat-bubble-row--user" : "chat-bubble-row--assistant"}`}>
            {!isUser && <RobotOutlined className="chat-bubble-icon chat-bubble-icon--assistant" />}
            <div className={`chat-bubble ${isUser ? "chat-bubble--user" : "chat-bubble--assistant"}`}>
                {isUser ? (
                    <Text style={{whiteSpace: "pre-wrap", wordBreak: "break-word"}}>{message.content}</Text>
                ) : showStreamCursor ? (
                    <Text type="secondary" aria-busy="true">
                        {"\u258c"}
                    </Text>
                ) : (
                    <MarkdownContent content={assistantContent} />
                )}
                {sources.length > 0 && (
                    <div className="chat-bubble__sources">
                        <span className="chat-bubble__sources-label">引用：</span>
                        {sources.map((s) => (
                            <Tag key={s.id} style={{marginTop: 4}}>
                                {s.title}
                            </Tag>
                        ))}
                    </div>
                )}
            </div>
            {isUser && <UserOutlined className="chat-bubble-icon chat-bubble-icon--user" />}
            </div>
        </div>
    );
});

export default ChatMessageBubble;
