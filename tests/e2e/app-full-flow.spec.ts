import { test, expect } from '@playwright/test';

/**
 * Full flow test — requires a real OPENAI_API_KEY in .env AND FastAPI running.
 *
 * Skipped by default. To run:
 *   1. Put a real OPENAI_API_KEY in .env
 *   2. `npm run dev:all` in one terminal
 *   3. `RUN_FULL_FLOW=1 npx playwright test app-full-flow`
 *
 * Gated on env var because (a) it costs OpenAI tokens, (b) it would otherwise
 * fail with a placeholder key. Auto-detection of "is the key real" via FastAPI
 * health alone is unreliable.
 */

test.describe('/app full generation flow (gated on RUN_FULL_FLOW=1)', () => {
    test.skip(() => !process.env.RUN_FULL_FLOW, 'Set RUN_FULL_FLOW=1 to run');
    // mobile project skip is enforced via testIgnore: /full-flow/ in playwright.config.ts

    test('generates a plan, critique works, download works', async ({ page, request }) => {
        test.setTimeout(300_000); // full flow (gen + critique + download) needs ~60s minimum
        // Probe FastAPI health AND attempt a quick check the API key is real
        let fastapiOk = false;
        try {
            const probe = await request.get('http://localhost:8000/api/health', { timeout: 1500 });
            fastapiOk = probe.ok();
        } catch {
            fastapiOk = false;
        }
        test.skip(!fastapiOk, 'FastAPI not running — skipping full flow');

        await page.goto('/app');
        await page.locator('#concept').fill('AI-assisted onboarding for hospital staff');
        await page.locator('.gen-btn').click();

        // Wait for the first section to appear (or for an error)
        const firstSection = page.locator('[data-section-id]').first();
        const errorBlock = page.locator('.plan-error');

        await Promise.race([
            firstSection.waitFor({ state: 'visible', timeout: 60_000 }),
            errorBlock.waitFor({ state: 'visible', timeout: 60_000 }),
        ]);

        // If the API key was placeholder, the error block will show — skip in that case
        if (await errorBlock.isVisible()) {
            const msg = await errorBlock.textContent();
            test.skip(
                msg?.includes('API key') === true,
                `API key not configured or invalid: ${msg}`
            );
        }

        // Wait for all 10 sections to render
        await expect(page.locator('[data-section-id]')).toHaveCount(10, { timeout: 90_000 });

        // ActionStack should be visible with downloads enabled
        await expect(page.getByTestId('action-download-docx')).toBeEnabled();

        // Trigger critique
        await page.getByTestId('action-critique').click();
        // Wait for critique summary to populate (loading → done)
        await expect(page.getByTestId('critique-summary')).toBeVisible({ timeout: 60_000 });
    });
});
