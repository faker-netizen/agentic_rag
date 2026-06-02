import {expect, test} from "@playwright/test";
import {loginViaApi} from "../../helpers/auth";
import {getE2eCredentials} from "../../helpers/env";

test.describe("桌面壳 @smoke", () => {
    test.beforeEach(({page: _page}, testInfo) => {
        if (!getE2eCredentials()) {
            testInfo.skip(true, "缺少 E2E_USER_EMAIL / E2E_USER_PASSWORD");
        }
    });

    test.beforeEach(async ({page, request}) => {
        await loginViaApi(page, request);
    });

    test("顶栏与 Dock 可见", async ({page}) => {
        await expect(page.getByText("文档 AI 工作台")).toBeVisible();
        await expect(page.getByRole("toolbar", {name: "应用坞"})).toBeVisible();
        await expect(page.getByTitle("RAG 对话")).toBeVisible();
    });

    test("从 Dock 打开 RAG 对话窗口", async ({page}) => {
        await page.getByTitle("RAG 对话").click();
        await expect(page.getByText("RAG 对话", {exact: true}).first()).toBeVisible();
    });
});
