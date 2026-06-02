import {Button, Input, Spin, Tag} from "antd";
import {SendOutlined, StopOutlined} from "@ant-design/icons";
import type {RefObject} from "react";
import type {ChatMessage, ChatSession} from "@/service/chatApi.ts";
import ChatMessageVirtualList, {
    type ChatMessageVirtualListHandle,
} from "@/components/ChatMessageVirtualList.tsx";

type ChatConversationProps = {
    session: ChatSession | null;
    messages: ChatMessage[];
    loadingMessages: boolean;
    streamingAssistantId: number | null;
    streamDisplay: string;
    messageListRef: RefObject<ChatMessageVirtualListHandle | null>;
    input: string;
    sending: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStopStream: () => void;
};

export default function ChatConversation({
    session,
    messages,
    loadingMessages,
    streamingAssistantId,
    streamDisplay,
    messageListRef,
    input,
    sending,
    onInputChange,
    onSend,
    onStopStream,
}: ChatConversationProps) {
    return (
        <>
            <div className="chat-main__header">
                <span className="chat-main__title">{session?.title ?? "会话"}</span>
                {session?.knowledge_base_id != null && (
                    <Tag style={{marginLeft: 8}} color="blue">
                        RAG 知识库
                    </Tag>
                )}
            </div>

            <div className="chat-messages-panel">
                {loadingMessages && (
                    <div className="chat-messages-panel__loading">
                        <Spin />
                    </div>
                )}
                <ChatMessageVirtualList
                    ref={messageListRef}
                    messages={messages}
                    loading={loadingMessages}
                    streamingAssistantId={streamingAssistantId}
                    streamDisplay={streamDisplay}
                />
            </div>

            <div className="chat-composer-wrap">
                <div className="chat-composer">
                    <Input.TextArea
                        value={input}
                        onChange={(e) => onInputChange(e.target.value)}
                        placeholder="输入消息，Enter 发送（Shift+Enter 换行）"
                        autoSize={{minRows: 1, maxRows: 6}}
                        variant="borderless"
                        onPressEnter={(e) => {
                            if (!e.shiftKey) {
                                e.preventDefault();
                                onSend();
                            }
                        }}
                        disabled={sending}
                    />
                    <div className="chat-composer__actions">
                        <Button
                            danger
                            size="small"
                            icon={<StopOutlined />}
                            disabled={!sending}
                            onClick={onStopStream}
                        >
                            停止
                        </Button>
                        <Button
                            type="primary"
                            size="small"
                            icon={<SendOutlined />}
                            loading={sending}
                            onClick={onSend}
                        >
                            发送
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
