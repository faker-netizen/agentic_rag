import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const UPLOADS_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../uploads"
);

export function getUploadsRoot(): string {
    return UPLOADS_ROOT;
}

/** 是否为本服务 uploads 目录下的本地文件（OSS key 不会匹配） */
export function isManagedLocalPath(filePath: string | null | undefined): boolean {
    if (!filePath) return false;
    const normalized = path.resolve(filePath);
    return normalized === UPLOADS_ROOT || normalized.startsWith(`${UPLOADS_ROOT}${path.sep}`);
}

/** 删除本地 uploads 下的文件；路径不在 uploads 内则忽略 */
export async function deleteStoredFile(filePath: string | null | undefined): Promise<void> {
    if (!isManagedLocalPath(filePath)) return;
    try {
        await fs.unlink(filePath!);
    } catch (e) {
        const code = (e as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") {
            console.warn("[storage] 删除文件失败:", filePath, e);
        }
    }
}
