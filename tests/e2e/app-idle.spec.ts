import { test, expect } from '@playwright/test';

test.describe('/app idle state (no model calls)', () => {
    test('renders hero, input, and examples', async ({ page }) => {
        await page.goto('/app');

        await expect(page.locator('.hero-title')).toBeVisible();
        await expect(page.locator('#concept')).toBeVisible();

        // Example chips
        const chips = page.locator('.chip');
        await expect(chips).toHaveCount(4);
    });

    test('generate button disabled when textarea empty, enabled when typed', async ({ page }) => {
        await page.goto('/app');
        const generateBtn = page.locator('.gen-btn');
        await expect(generateBtn).toBeDisabled();

        await page.locator('#concept').fill('A note-taking app for podcasters');
        await expect(generateBtn).toBeEnabled();
    });

    test('clicking an example chip populates the textarea', async ({ page }) => {
        await page.goto('/app');
        const firstChip = page.locator('.chip').first();
        const chipText = await firstChip.textContent();
        await firstChip.click();
        const textareaValue = await page.locator('#concept').inputValue();
        expect(textareaValue).toBe(chipText?.trim());
    });

    test('"Add details" toggle reveals optional fields', async ({ page }) => {
        await page.goto('/app');

        const toggle = page.locator('.details-toggle');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');

        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#industry')).toBeVisible();
        await expect(page.locator('#stage')).toBeVisible();
        await expect(page.locator('#market')).toBeVisible();
    });
});
