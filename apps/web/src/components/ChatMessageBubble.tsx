import {memo} from "react";
import {Flex, Tag, Typography, theme} from "antd";
import {RobotOutlined, UserOutlined} from "@ant-design/icons";
import type {ChatMessage, ChatSource} from "@/service/chatApi.ts";
import MarkdownContent from "@/components/MarkdownContent";

const {Text} = Typography;

export function parseSources(raw: unknown): ChatSource[] {
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
    const {token} = theme.useToken();
    const isUser = message.role === "user";
    const sources = message.role === "assistant" ? parseSources(message.sources_json) : [];
    const assistantContent = isStreaming ? (streamDisplay ?? "") : message.content;
    const showStreamCursor = isStreaming && !assistantContent.trim();
    return (
        <Flex justify={isUser ? "flex-end" : "flex-start"}>
            <Flex gap={8} style={{maxWidth: "min(720px, 85%)"}} align="flex-start">
                {!isUser && (
                    <RobotOutlined
                        style={{
                            fontSize: 18,
                            marginTop: 4,
                            color: token.colorPrimary,
                        }}
                    />
                )}
                <div
                    style={{
                        background: isUser ? token.colorPrimaryBg : token.colorFillSecondary,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: token.borderRadiusLG,
                        padding: "10px 14px",
                    }}
                >
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
                        <div style={{marginTop: 8}}>
                            <Text type="secondary" style={{fontSize: 12}}>
                                引用：
                            </Text>{" "}
                            {sources.map((s) => (
                                <Tag key={s.id} style={{marginTop: 4}}>
                                    {s.title}
                                </Tag>
                            ))}
                        </div>
                    )}
                </div>
                {isUser && <UserOutlined style={{fontSize: 18, marginTop: 4, color: token.colorTextSecondary}} />}
            </Flex>
        </Flex>
    );
});

export default ChatMessageBubble;
