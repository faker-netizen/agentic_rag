import {Button, Modal, Progress, Space, Typography} from "antd";
import type {UploadStatus, UploadTaskSnapshot} from "@d2c/utils";
import type {ChunkedUploadTask} from "@d2c/utils";

const {Text} = Typography;

const STATUS_LABEL: Record<UploadStatus, string> = {
    idle: "等待中",
    hashing: "计算文件指纹…",
    preparing: "初始化上传…",
    uploading: "上传中",
    paused: "已暂停",
    merging: "合并分片并入库…",
    success: "完成",
    error: "失败",
    canceled: "已取消",
};

type ChunkUploadModalProps = {
    open: boolean;
    fileName: string;
    snapshot: UploadTaskSnapshot | null;
    task: ChunkedUploadTask | null;
    onClose: () => void;
};

export default function ChunkUploadModal({
    open,
    fileName,
    snapshot,
    task,
    onClose,
}: ChunkUploadModalProps) {
    const status = snapshot?.status ?? "idle";
    const percent = snapshot?.progress ?? 0;
    const busy = status === "hashing" || status === "preparing" || status === "uploading" || status === "merging";
    const canPause = status === "uploading";
    const canResume = status === "paused" || status === "error";
    const canCancel = busy || status === "paused";

    return (
        <Modal
            title="上传文件"
            open={open}
            footer={null}
            closable={!busy}
            maskClosable={false}
            onCancel={() => {
                if (!busy) onClose();
            }}
            destroyOnClose
        >
            <Space direction="vertical" style={{width: "100%"}} size="middle">
                <Text ellipsis title={fileName}>
                    {fileName}
                </Text>
                <Progress
                    percent={percent}
                    status={
                        status === "error"
                            ? "exception"
                            : status === "success"
                              ? "success"
                              : busy
                                ? "active"
                                : "normal"
                    }
                />
                <Text type="secondary">
                    {STATUS_LABEL[status]}
                    {snapshot && snapshot.totalChunks > 0
                        ? ` · ${snapshot.uploadedChunks}/${snapshot.totalChunks} 分片`
                        : null}
                </Text>
                {snapshot?.error ? <Text type="danger">{snapshot.error}</Text> : null}
                <Space>
                    {canPause && task ? <Button onClick={() => task.pause()}>暂停</Button> : null}
                    {canResume && task ? (
                        <Button type="primary" onClick={() => void task.resume()}>
                            继续
                        </Button>
                    ) : null}
                    {canCancel && task ? (
                        <Button danger onClick={() => void task.cancel()}>
                            取消
                        </Button>
                    ) : null}
                    {status === "success" || status === "canceled" || status === "error" ? (
                        <Button onClick={onClose}>关闭</Button>
                    ) : null}
                </Space>
            </Space>
        </Modal>
    );
}
