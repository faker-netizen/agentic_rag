import {Button, Input} from "antd";
import {SendOutlined, StopOutlined} from "@ant-design/icons";

type ChatComposerProps = {
    input: string;
    sending: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStopStream: () => void;
};

export default function ChatComposer({
    input,
    sending,
    onInputChange,
    onSend,
    onStopStream,
}: ChatComposerProps) {
    return (
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
                <Button type="primary" size="small" icon={<SendOutlined />} loading={sending} onClick={onSend}>
                    发送
                </Button>
            </div>
        </div>
    );
}
