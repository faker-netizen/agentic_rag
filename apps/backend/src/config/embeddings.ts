import dotenv from "dotenv";

dotenv.config();

export type Vector = number[];

function getConfig() {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
        throw new Error("Missing ZHIPU_API_KEY in .env");
    }

    const baseURL =
        process.env.ZHIPU_BASE_URL || "https://open.bigmodel.cn/api/paas/v4";
    const model = process.env.ZHIPU_EMBEDDING_MODEL || "embedding-2";

    return { apiKey, baseURL: baseURL.replace(/\/+$/, ""), model };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        res.push(arr.slice(i, i + size));
    }
    return res;
}

export class ZhipuEmbeddingsClient {
    private apiKey: string;
    private baseURL: string;
    private model: string;

    constructor() {
        const { apiKey, baseURL, model } = getConfig();
        this.apiKey = apiKey;
        this.baseURL = baseURL;
        this.model = model;
    }

    async embedQuery(text: string): Promise<Vector> {
        const vectors = await this.embedDocuments([text], { batchSize: 1 });
        return vectors[0] ?? [];
    }

    async embedDocuments(
        texts: string[],
        opts?: { batchSize?: number; retry?: number }
    ): Promise<Vector[]> {
        if (!texts.length) return [];

        const batchSize = opts?.batchSize ?? 64;
        const retry = opts?.retry ?? 2;

        const batches = chunkArray(texts, batchSize);
        const allVectors: Vector[] = [];

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            const vectors = await this.requestWithRetry(batch, retry, i);
            allVectors.push(...vectors);
        }

        if (allVectors.length !== texts.length) {
            throw new Error(
                `Embedding size mismatch: input=${texts.length}, output=${allVectors.length}`
            );
        }

        return allVectors;
    }

    private async requestWithRetry(
        inputBatch: string[],
        retry: number,
        batchIndex: number
    ): Promise<Vector[]> {
        let lastErr: any;

        for (let attempt = 0; attempt <= retry; attempt++) {
            try {
                const vectors = await this.requestEmbeddings(inputBatch);
                return vectors;
            } catch (err) {
                lastErr = err;
                if (attempt < retry) {
                    const delay = 500 * Math.pow(2, attempt);
                    await new Promise((r) => setTimeout(r, delay));
                }
            }
        }

        throw new Error(
            `Embedding batch failed. batchIndex=${batchIndex}, batchSize=${inputBatch.length}, error=${String(
                lastErr
            )}`
        );
    }

    private async requestEmbeddings(input: string[]): Promise<Vector[]> {
        const url = `${this.baseURL}/embeddings`;

        const resp = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                input, // 批量输入
                dimensions:512
            }),
        });

        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${text}`);
        }

        const json: any = await resp.json();

        if (!json?.data || !Array.isArray(json.data)) {
            throw new Error(`Invalid embedding response: ${JSON.stringify(json)}`);
        }

        // 兼容按 index 排序
        const sorted = [...json.data].sort(
            (a, b) => (a.index ?? 0) - (b.index ?? 0)
        );
        const vectors: Vector[] = sorted.map((item: any) => item.embedding);

        // 基础校验
        for (const v of vectors) {
            if (!Array.isArray(v) || !v.length) {
                throw new Error("Invalid vector in response");
            }
        }

        return vectors;
    }
}

export const createEmbeddingsModel = () => {
    return new ZhipuEmbeddingsClient();
};
