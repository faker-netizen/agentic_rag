import {Button, Upload, message} from "antd";
import {UploadOutlined} from "@ant-design/icons";
import {uploadErrMsg} from "@/pages/chat/chatUtils.ts";

type KnowledgeBaseFileUploadProps = {
    onUpload: (file: File) => Promise<void>;
};

export default function KnowledgeBaseFileUpload({onUpload}: KnowledgeBaseFileUploadProps) {
    return (
        <Upload
            showUploadList={false}
            accept=".pdf,.doc,.docx,.txt,.md"
            beforeUpload={async (file) => {
                try {
                    await onUpload(file);
                    message.success("上传成功");
                } catch (e) {
                    message.error(uploadErrMsg(e) || (e instanceof Error ? e.message : "上传失败"));
                }
                return false;
            }}
        >
            <Button type="primary" icon={<UploadOutlined />}>
                上传文件
            </Button>
        </Upload>
    );
}
