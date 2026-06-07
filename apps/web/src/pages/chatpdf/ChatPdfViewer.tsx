import {forwardRef} from "react";
import ChatPdfViewerInner, {type ChatPdfViewerHandle} from "@/pages/chatpdf/ChatPdfViewerInner.tsx";

export type {ChatPdfViewerHandle};

type ChatPdfViewerProps = {
    documentId: number | null;
};

const ChatPdfViewer = forwardRef<ChatPdfViewerHandle, ChatPdfViewerProps>(function ChatPdfViewer(
    {documentId},
    ref
) {
    if (documentId == null) {
        return <div className="chatpdf-viewer chatpdf-viewer--empty">请上传 PDF 文件</div>;
    }
    return <ChatPdfViewerInner key={documentId} ref={ref} documentId={documentId} />;
});

export default ChatPdfViewer;
