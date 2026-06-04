import {Spin, Tag, Typography} from "antd";
import type {DomainSkillItem} from "@/service/skillsApi.ts";
import type {RefObject} from "react";
import type {ChatMessage, ChatSession} from "@/service/chatApi.ts";
import ChatMessageVirtualList, {
    type ChatMessageVirtualListHandle,
} from "@/components/ChatMessageVirtualList.tsx";
import ChatSkillSelect from "@/pages/chat/ChatSkillSelect.tsx";
import ChatComposer from "@/pages/chat/ChatComposer.tsx";

type ChatConversationProps = {
    session: ChatSession | null;
    messages: ChatMessage[];
    loadingMessages: boolean;
    streamingAssistantId: number | null;
    streamDisplay: string;
    streamStatus: string | null;
    activeSkillName: string | null;
    skills: DomainSkillItem[];
    selectedSkillId: string | null;
    onSkillChange: (id: string | null) => void;
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
    streamStatus,
    activeSkillName,
    skills,
    selectedSkillId,
    onSkillChange,
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
                        知识库
                    </Tag>
                )}
                {activeSkillName && (
                    <Tag style={{marginLeft: 8}} color="purple">
                        {activeSkillName}
                    </Tag>
                )}
            </div>

            <div className="chat-messages-panel">
                {streamStatus && (
                    <div className="chat-stream-status">
                        <Typography.Text type="secondary">{streamStatus}</Typography.Text>
                    </div>
                )}
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
                {session?.knowledge_base_id != null && (
                    <ChatSkillSelect
                        skills={skills}
                        selectedSkillId={selectedSkillId}
                        sending={sending}
                        onSkillChange={onSkillChange}
                    />
                )}
                <ChatComposer
                    input={input}
                    sending={sending}
                    onInputChange={onInputChange}
                    onSend={onSend}
                    onStopStream={onStopStream}
                />
            </div>
        </>
    );
}
