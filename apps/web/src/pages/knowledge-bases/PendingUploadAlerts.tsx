import {Alert, Button} from "antd";
import type {PendingChunkUploadView} from "@/service/knowledgeBaseApi.ts";

type PendingUploadAlertsProps = {
    pendingUploads: PendingChunkUploadView[];
    onResume: (pending: PendingChunkUploadView) => void;
    onAbandon: (fileId: string) => void;
};

export default function PendingUploadAlerts({
    pendingUploads,
    onResume,
    onAbandon,
}: PendingUploadAlertsProps) {
    if (pendingUploads.length === 0) return null;

    return (
        <div className="kb-finder__alerts">
            {pendingUploads.map((p) => (
                <Alert
                    key={p.fileId}
                    type="warning"
                    showIcon
                    message={`未完成上传：${p.fileName}`}
                    description={`已保存 ${p.uploadedChunks}/${p.totalChunks} 个分片`}
                    action={
                        <div className="kb-finder__alert-actions">
                            <Button size="small" type="primary" onClick={() => onResume(p)}>
                                继续
                            </Button>
                            <Button size="small" danger onClick={() => onAbandon(p.fileId)}>
                                放弃
                            </Button>
                        </div>
                    }
                />
            ))}
        </div>
    );
}
