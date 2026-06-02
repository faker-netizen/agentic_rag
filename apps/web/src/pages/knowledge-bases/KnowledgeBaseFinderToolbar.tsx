import {Button, Upload} from "antd";
import {FolderOpenOutlined, UploadOutlined} from "@ant-design/icons";

type KnowledgeBaseFinderToolbarProps = {
    docCount: number;
    onUpload: (file: File) => void;
};

export default function KnowledgeBaseFinderToolbar({docCount, onUpload}: KnowledgeBaseFinderToolbarProps) {
    return (
        <header className="kb-finder__toolbar">
            <div className="kb-finder__toolbar-start">
                <FolderOpenOutlined className="kb-finder__toolbar-icon" />
                <span className="kb-finder__toolbar-title">文档</span>
                <span className="kb-finder__toolbar-count">{docCount} 项</span>
            </div>
            <Upload
                showUploadList={false}
                accept=".pdf,.doc,.docx,.txt,.md"
                beforeUpload={(file) => {
                    void onUpload(file);
                    return false;
                }}
            >
                <Button type="primary" size="small" icon={<UploadOutlined />} className="kb-finder__upload">
                    上传
                </Button>
            </Upload>
        </header>
    );
}
