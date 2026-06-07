import {Button, Empty, Spin, Typography} from "antd";
import type {PdfCitation, PdfSummaryPayload} from "@/service/chatpdfTypes.ts";
import SummaryBullets from "@/pages/chatpdf/SummaryBullets.tsx";

type ChatPdfSummaryPanelProps = {
    documentId: number | null;
    summary: PdfSummaryPayload | null;
    loading: boolean;
    statusLabel: string | null;
    onSummarize: () => void;
    onCitationClick: (citation: PdfCitation) => void;
};

export default function ChatPdfSummaryPanel({
    documentId,
    summary,
    loading,
    statusLabel,
    onSummarize,
    onCitationClick,
}: ChatPdfSummaryPanelProps) {
    return (
        <div className="chatpdf-summary">
            <div className="chatpdf-summary__header">
                <Typography.Title level={5} style={{margin: 0}}>
                    分点总结
                </Typography.Title>
                <Button
                    type="primary"
                    size="small"
                    disabled={documentId == null || loading}
                    loading={loading}
                    onClick={onSummarize}
                >
                    生成总结
                </Button>
            </div>
            {statusLabel && (
                <Typography.Text type="secondary" className="chatpdf-summary__status">
                    {statusLabel}
                </Typography.Text>
            )}
            <div className="chatpdf-summary__body">
                {loading && !summary && (
                    <div className="chatpdf-summary__loading">
                        <Spin />
                    </div>
                )}
                {!loading && !summary && (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="点击生成全文分点总结" />
                )}
                {summary && (
                    <SummaryBullets
                        bullets={summary.bullets}
                        citations={summary.citations}
                        onCitationClick={onCitationClick}
                    />
                )}
            </div>
        </div>
    );
}
