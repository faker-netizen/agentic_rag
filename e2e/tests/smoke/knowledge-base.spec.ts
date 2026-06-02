import {expect, test} from "@playwright/test";
import {loginViaApi, fetchAccessToken} from "../../helpers/auth";
import {getE2eApiUrl, getE2eCredentials} from "../../helpers/env";
import {
    createKnowledgeBaseApi,
    createKnowledgeBaseViaUi,
    deleteKnowledgeBaseApi,
    e2eUniqueName,
    expectFinderWindow,
    openDesktopKnowledgeBase,
} from "../../helpers/knowledgeBase";

test.describe("知识库与文档 @smoke", () => {
    const kbIdsToCleanup: number[] = [];

    test.beforeEach(({page: _page}, testInfo) => {
        if (!getE2eCredentials()) {
            testInfo.skip(true, "缺少 E2E_USER_EMAIL / E2E_USER_PASSWORD");
        }
    });

    test.beforeEach(async ({page, request}) => {
        await loginViaApi(page, request);
    });

    test.afterEach(async ({request}) => {
        const token = await fetchAccessToken(request);
        while (kbIdsToCleanup.length > 0) {
            const id = kbIdsToCleanup.pop();
            if (id != null) {
                await deleteKnowledgeBaseApi(request, token, id).catch(() => undefined);
            }
        }
    });

    test("顶栏新建知识库 → 桌面文件夹 → 自动打开 Finder", async ({page, request}) => {
        const kbName = e2eUniqueName("E2E-UI-KB");
        await createKnowledgeBaseViaUi(page, kbName);

        await expect(page.getByRole("button", {name: kbName})).toBeVisible({timeout: 10_000});

        const listRes = await request.get(`${getE2eApiUrl()}/api/knowledge-bases`, {
            headers: {Authorization: `Bearer ${await fetchAccessToken(request)}`},
        });
        const listBody = (await listRes.json()) as {knowledgeBases?: Array<{id: number; name: string}>};
        const created = listBody.knowledgeBases?.find((k) => k.name === kbName);
        if (created) kbIdsToCleanup.push(created.id);

        await expectFinderWindow(page, kbName);
    });

    test("点击桌面文件夹打开 Finder 窗口", async ({page, request}) => {
        const token = await fetchAccessToken(request);
        const kbName = e2eUniqueName("E2E-Folder");
        const kbId = await createKnowledgeBaseApi(request, token, kbName);
        kbIdsToCleanup.push(kbId);

        await page.reload();
        await expect(page.getByRole("navigation", {name: "主菜单"})).toBeVisible();

        await openDesktopKnowledgeBase(page, kbName);
        await expectFinderWindow(page, kbName);
    });

    test("Finder 上传 txt 文档并出现在列表", async ({page, request}) => {
        const token = await fetchAccessToken(request);
        const kbName = e2eUniqueName("E2E-Upload");
        const kbId = await createKnowledgeBaseApi(request, token, kbName);
        kbIdsToCleanup.push(kbId);

        await page.reload();
        await openDesktopKnowledgeBase(page, kbName);
        await expectFinderWindow(page, kbName);

        const fileName = `e2e-${Date.now()}.txt`;
        const fileContent = `E2E upload sample ${Date.now()}\nPlaywright Phase 2.`;

        const [fileChooser] = await Promise.all([
            page.waitForEvent("filechooser"),
            page.getByRole("button", {name: "上传"}).click(),
        ]);
        await fileChooser.setFiles({
            name: fileName,
            mimeType: "text/plain",
            buffer: Buffer.from(fileContent, "utf-8"),
        });

        await expect(page.getByText("上传成功")).toBeVisible({timeout: 30_000});
        await expect(page.getByText(fileName)).toBeVisible({timeout: 15_000});
        await expect(page.getByText("1 项")).toBeVisible();
    });
});
