import {expect, type APIRequestContext} from "@playwright/test";
import {fetchAccessToken} from "./auth";
import {getE2eApiUrl} from "./env";

export function e2eUniqueName(prefix: string): string {
    return `${prefix}-${Date.now()}`;
}

function authHeaders(token: string): Record<string, string> {
    return {Authorization: `Bearer ${token}`};
}

export async function createKnowledgeBaseApi(
    request: APIRequestContext,
    token: string,
    name: string,
    description?: string
): Promise<number> {
    const res = await request.post(`${getE2eApiUrl()}/api/knowledge-bases`, {
        headers: authHeaders(token),
        data: {name, ...(description ? {description} : {})},
    });
    expect(res.ok(), `创建知识库失败: ${res.status()} ${await res.text()}`).toBeTruthy();
    const body = (await res.json()) as {id?: number};
    if (body.id == null) throw new Error("创建知识库响应缺少 id");
    return body.id;
}

export async function deleteKnowledgeBaseApi(
    request: APIRequestContext,
    token: string,
    kbId: number
): Promise<void> {
    const res = await request.delete(`${getE2eApiUrl()}/api/knowledge-bases/${kbId}`, {
        headers: authHeaders(token),
    });
    expect(res.ok(), `删除知识库失败: ${res.status()} ${await res.text()}`).toBeTruthy();
}

/** 顶栏菜单：新建知识库并等待 Finder 窗口 */
export async function createKnowledgeBaseViaUi(
    page: import("@playwright/test").Page,
    name: string
): Promise<void> {
    await page.getByRole("button", {name: "新建知识库"}).click();
    const dialog = page.getByRole("dialog", {name: "新建知识库"});
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("名称").fill(name);
    await dialog.getByRole("button", {name: /创\s*建/}).click();
    await expect(dialog).toBeHidden({timeout: 15_000});
}

/** 点击桌面文件夹图标 */
export async function openDesktopKnowledgeBase(
    page: import("@playwright/test").Page,
    kbName: string
): Promise<void> {
    await page.getByRole("button", {name: kbName}).click();
}

/** Finder 窗口内工具栏可见 */
export async function expectFinderWindow(page: import("@playwright/test").Page, kbName: string): Promise<void> {
    await expect(page.locator(".app-window__title", {hasText: kbName})).toBeVisible();
    const finder = page.locator(".kb-finder");
    await expect(finder).toBeVisible();
    await expect(finder.getByRole("button", {name: "上传"})).toBeVisible();
    await expect(finder.getByText("文档", {exact: true})).toBeVisible();
}
