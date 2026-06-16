import { test, expect } from '@playwright/test';

test.describe('Landing page (/)', () => {
    test('renders hero, problem, how-it-works, decisions, and CTAs', async ({ page }) => {
        await page.goto('/');

        // Hero (buyer-facing rewrite — static headline; rotating word removed per ADR-010/DESIGN-SPEC E1)
        await expect(page.locator('.landing-h1')).toContainText('taken seriously');
        await expect(page.locator('.landing-sub')).toContainText('investor-ready');

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

        // Buyer-facing differentiation — 4 cards (replaces builder-facing "locked decisions")
        await expect(page.locator('.buyer-diff-card')).toHaveCount(4);

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

});
