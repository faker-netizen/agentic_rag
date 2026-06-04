import type {
    DocumentIndexingStatus,
    DocumentSummaryStatus,
} from "@/service/knowledgeBaseApi.ts";

export function summaryStatusLabel(status: DocumentSummaryStatus): string {
    switch (status) {
        case "ready":
            return "已摘要";
        case "pending":
            return "摘要中";
        case "failed":
            return "摘要失败";
        default:
            return "未摘要";
    }
}

export function indexingStatusLabel(status: DocumentIndexingStatus): string {
    switch (status) {
        case "indexed":
            return "可检索";
        case "pending":
            return "索引中";
        case "failed":
            return "索引失败";
        default:
            return "未索引";
    }
}

export function isSummaryBusy(status: DocumentSummaryStatus): boolean {
    return status === "pending";
}

export function isIndexingBusy(status: DocumentIndexingStatus): boolean {
    return status === "pending";
}
