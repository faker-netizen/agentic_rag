import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from "react";
import {message, Spin} from "antd";
import {Document, Page} from "react-pdf";
import type {PdfCitation} from "@/service/chatpdfTypes.ts";
import {fetchChatPdfBlob} from "@/service/chatpdfApi.ts";
import {clearChatPdfHighlights, tryHighlightExcerpt} from "@/pages/chatpdf/chatpdfHighlight.ts";
import "@/pages/chatpdf/pdfjsSetup.ts";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

export type ChatPdfViewerHandle = {
    goToCitation: (citation: PdfCitation) => void;
};

type ChatPdfViewerInnerProps = {
    documentId: number;
};

const ChatPdfViewerInner = forwardRef<ChatPdfViewerHandle, ChatPdfViewerInnerProps>(
    function ChatPdfViewerInner({documentId}, ref) {
        const [blobUrl, setBlobUrl] = useState<string | null>(null);
        const [loading, setLoading] = useState(true);
        const [numPages, setNumPages] = useState(0);
        const [page, setPage] = useState(1);
        const hostRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            let revoke: string | null = null;
            let cancelled = false;
            void fetchChatPdfBlob(documentId)
                .then((blob) => {
                    console.log(blob)
                    if (cancelled) return;
                    const url = URL.createObjectURL(blob);
                    revoke = url;
                    setBlobUrl(url);
                    setPage(1);
                    setLoading(false);
                })
                .catch((e) => {
                    if (cancelled) return;
                    message.error(e instanceof Error ? e.message : "加载 PDF 失败");
                    setLoading(false);
                });
            return () => {
                cancelled = true;
                if (revoke) URL.revokeObjectURL(revoke);
            };
        }, [documentId]);

        const goToCitation = useCallback(
            (citation: PdfCitation) => {
                if (citation.page < 1 || (numPages > 0 && citation.page > numPages)) return;
                setPage(citation.page);
                requestAnimationFrame(() => {
                    clearChatPdfHighlights(hostRef.current);
                    const ok = tryHighlightExcerpt(hostRef.current, citation.excerpt);
                    if (!ok) message.info(`已跳转到第 ${citation.page} 页，未定位到原文片段`);
                });
            },
            [numPages]
        );

        useImperativeHandle(ref, () => ({goToCitation}), [goToCitation]);

        if (loading || !blobUrl) {
            return (
                <div className="chatpdf-viewer chatpdf-viewer--loading">
                    <Spin />
                </div>
            );
        }

        return (
            <div className="chatpdf-viewer" ref={hostRef}>
                <div className="chatpdf-viewer__pager">
                    <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        上一页
                    </button>
                    <span>
                        {page} / {numPages || "?"}
                    </span>
                    <button
                        type="button"
                        disabled={numPages > 0 && page >= numPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        下一页
                    </button>
                </div>
                <div className="chatpdf-viewer__doc">
                    <Document file={blobUrl} onLoadSuccess={(d) => setNumPages(d.numPages)}>
                        <Page pageNumber={page} width={480} renderTextLayer renderAnnotationLayer />
                    </Document>
                </div>
            </div>
        );
    }
);

export default ChatPdfViewerInner;
