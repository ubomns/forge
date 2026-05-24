import { test, expect } from '@playwright/test';

test.describe('Demo page (/demo)', () => {
    test('renders frozen plan with critiques and investor questions', async ({ page }) => {
        await page.goto('/demo');

        // Banner present
        await expect(page.getByTestId('demo-banner')).toBeVisible();
        await expect(page.getByTestId('demo-banner')).toContainText('DEMO PLAN');

        // Concept banner has the source idea
        await expect(page.locator('.concept-text')).toContainText('childcare', { ignoreCase: true });

        // Plan sections render — at least 10 sections expected from the schema
        const planSections = page.locator('[data-section-id]');
        const sectionCount = await planSections.count();
        expect(sectionCount).toBe(10);

        // Critiques render somewhere
        const critiqueCards = page.locator('.critique-card');
        const critiqueCount = await critiqueCards.count();
        expect(critiqueCount).toBeGreaterThan(0);

        // Investor questions section renders
        await expect(page.getByTestId('investor-questions')).toBeVisible();
        const questionCards = page.getByTestId('investor-question-card');
        const questionCount = await questionCards.count();
        expect(questionCount).toBeGreaterThan(0);
    });

    test('dismissing a high-severity critique decrements the count', async ({ page }) => {
        await page.goto('/demo');

        const highBadges = page.locator('.critique-severity-high');
        const initial = await highBadges.count();
        expect(initial).toBeGreaterThan(0);

        // Dismiss the first card carrying a "High" badge
        const dismissBtn = highBadges
            .first()
            .locator('xpath=ancestor::div[contains(@class, "critique-card")]')
            .first()
            .locator('.critique-action-dismiss');
        await dismissBtn.click();

        // After animation, the high-severity count should drop by exactly one
        await expect(highBadges).toHaveCount(initial - 1, { timeout: 3000 });
    });

    test('investor question card link jumps to its section', async ({ page }) => {
        await page.goto('/demo');

        const jumpBtn = page.locator('.investor-question-jumplink').first();
        await expect(jumpBtn).toBeVisible();
        // Click triggers smooth-scroll; we just verify no errors and scroll happens
        const scrollBefore = await page.evaluate(() => window.scrollY);
        await jumpBtn.click();
        await page.waitForTimeout(600);
        const scrollAfter = await page.evaluate(() => window.scrollY);
        // Scroll should have changed (either up or down depending on starting position)
        expect(scrollAfter).not.toBe(scrollBefore);
    });

    test('downloads endpoint is reachable when FastAPI is up (skipped if not)', async ({ page, request }) => {
        // Probe FastAPI health
        let fastapiUp = false;
        try {
            const probe = await request.get('http://localhost:8000/api/health', { timeout: 1500 });
            fastapiUp = probe.ok();
        } catch {
            fastapiUp = false;
        }
        test.skip(!fastapiUp, 'FastAPI not running on :8000 — skipping download test');

        await page.goto('/demo');

        const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
        await page.getByTestId('demo-download-docx').click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.docx$/);
    });
});
