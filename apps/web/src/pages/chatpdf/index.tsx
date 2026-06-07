import {MacAppPage, MacToolbar} from "@/components/shell";
import ChatPdfViewer, {type ChatPdfViewerHandle} from "@/pages/chatpdf/ChatPdfViewer.tsx";
import ChatPdfSummaryPanel from "@/pages/chatpdf/ChatPdfSummaryPanel.tsx";
import {useChatPdfPage} from "@/pages/chatpdf/useChatPdfPage.ts";
import {UploadOutlined} from "@ant-design/icons";
import {Upload} from "antd";
import {useRef} from "react";
import {useWindowContentMeta} from "@/desktop/windowContentContext.ts";
import "./chatpdf.css";

export default function ChatPdfPage() {
    const meta = useWindowContentMeta();
    const viewerRef = useRef<ChatPdfViewerHandle>(null);
    const state = useChatPdfPage(meta?.documentId);

    return (
        <MacAppPage
            toolbar={
                <MacToolbar>
                    <Upload
                        accept=".pdf"
                        showUploadList={false}
                        beforeUpload={(file) => {
                            void state.onUpload(file);
                            return false;
                        }}
                    >
                        <button type="button" className="mac-button">
                            <UploadOutlined /> 上传 PDF
                        </button>
                    </Upload>
                </MacToolbar>
            }
            bodyClassName="chatpdf-layout"
        >
            <ChatPdfViewer ref={viewerRef} documentId={state.documentId} />
            <ChatPdfSummaryPanel
                documentId={state.documentId}
                summary={state.summary}
                loading={state.summarizing}
                statusLabel={state.statusLabel}
                onSummarize={state.onSummarize}
                onCitationClick={(c) => viewerRef.current?.goToCitation(c)}
            />
        </MacAppPage>
    );
}
