import {expect, test} from "@playwright/test";
import {getE2eCredentials} from "../../helpers/env";

test.describe("登录 @smoke", () => {
    test.beforeEach(({page: _page}, testInfo) => {
        if (!getE2eCredentials()) {
            testInfo.skip(true, "缺少 E2E_USER_EMAIL / E2E_USER_PASSWORD");
        }
    });

    test("未登录访问桌面会跳转登录页", async ({page}) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole("heading", {name: "欢迎回来"})).toBeVisible();
    });

    test("邮箱密码登录进入桌面", async ({page}) => {
        const creds = getE2eCredentials();
        if (!creds) return;

        await page.goto("/login");
        await page.getByLabel("邮箱").fill(creds.email);
        await page.getByLabel("密码").fill(creds.password);
        await page.getByRole("button", {name: /登\s*录/}).click();

        await expect(page).toHaveURL("/");
        await expect(page.getByRole("navigation", {name: "主菜单"})).toBeVisible();
        await expect(page.getByRole("button", {name: "新建知识库"})).toBeVisible();
    });
});
