import { test, expect } from '@playwright/test';

test.describe('Landing page (/)', () => {
    test('renders hero, problem, how-it-works, decisions, and CTAs', async ({ page }) => {
        await page.goto('/');

        // Hero
        await expect(page.locator('.landing-h1')).toContainText('First drafts that are');
        await expect(page.locator('.landing-h1-accent')).toBeVisible();
        await expect(page.locator('.landing-sub')).toContainText('typed');

        // CTAs
        const generateCta = page.getByTestId('landing-cta-generate');
        const demoCta = page.getByTestId('landing-cta-demo');
        await expect(generateCta).toHaveAttribute('href', '/app');
        await expect(demoCta).toHaveAttribute('href', '/demo');

        // Problem block — exact quote from handover
        await expect(page.locator('.landing-quote')).toContainText('ten sections that read like the model averaging');

        // How it works — 3 cards
        const howCards = page.locator('.landing-how-card');
        await expect(howCards).toHaveCount(3);
        await expect(howCards.first()).toContainText('Schema-first');

        // Locked decisions — at least 6 cards
        const decisionCards = page.locator('.landing-decision-card');
        const count = await decisionCards.count();
        expect(count).toBeGreaterThanOrEqual(6);

        // Footer CTA mirrors hero
        await expect(page.locator('.landing-footer-h2')).toContainText('Ready to forge yours?');
    });

    test('clicking the demo CTA goes to /demo', async ({ page }) => {
        await page.goto('/');
        await page.getByTestId('landing-cta-demo').first().click();
        await expect(page).toHaveURL(/\/demo\/?$/);
        await expect(page.getByTestId('demo-banner')).toBeVisible();
    });

    test('clicking the generate CTA goes to /app', async ({ page }) => {
        await page.goto('/');
        await page.getByTestId('landing-cta-generate').first().click();
        await expect(page).toHaveURL(/\/app\/?$/);
        // /app idle should show AnimatedHero
        await expect(page.locator('.hero-title')).toBeVisible();
    });

    test('rotating hero word changes over time', async ({ page }) => {
        await page.goto('/');
        const initial = await page.locator('.landing-h1-accent').first().textContent();
        // The word rotates every 2200ms. Poll for up to 6s for any different word.
        await expect
            .poll(async () => await page.locator('.landing-h1-accent').first().textContent(), {
                timeout: 6_000,
                intervals: [200, 400, 600],
            })
            .not.toBe(initial);
    });
});
