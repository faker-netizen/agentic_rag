import {expect, type APIRequestContext, type Page} from "@playwright/test";
import {getE2eApiUrl, getE2eBaseUrl, requireE2eCredentials} from "./env";

export async function fetchAccessToken(request: APIRequestContext): Promise<string> {
    const {email, password} = requireE2eCredentials();
    const res = await request.post(`${getE2eApiUrl()}/api/auth/login`, {
        data: {email, password},
    });
    expect(res.ok(), `登录 API 失败: ${res.status()} ${await res.text()}`).toBeTruthy();
    const body = (await res.json()) as {accessToken?: string};
    if (!body.accessToken) {
        throw new Error("登录响应缺少 accessToken");
    }
    return body.accessToken;
}

/** API 登录并将 accessToken 写入 localStorage，再进入桌面 */
export async function loginViaApi(page: Page, request: APIRequestContext): Promise<void> {
    const token = await fetchAccessToken(request);
    await page.goto(`${getE2eBaseUrl()}/login`);
    await page.evaluate((t) => {
        localStorage.setItem("accessToken", t);
    }, token);
    await page.goto(`${getE2eBaseUrl()}/`);
    await expect(page.getByRole("navigation", {name: "主菜单"})).toBeVisible();
}
