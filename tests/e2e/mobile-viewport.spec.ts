import { test, expect } from '@playwright/test';

/**
 * Mobile viewport-meta and horizontal-overflow tests.
 *
 * Verifies the fix shipped in pages/_app.tsx:
 *   <meta name="viewport" content="width=device-width, initial-scale=1" />
 *
 * These tests run on BOTH projects (chromium @ 1366px and mobile @ 390px)
 * because:
 *   - The viewport meta must be present regardless of viewport width.
 *   - The overflow check is meaningful at 390px (the broken case) but we
 *     also run it at desktop width as a sanity check.
 *
 * Acceptance criteria verified:
 *   AC-1  viewport meta tag present in <head> on / and /demo
 *   AC-2  document.documentElement.scrollWidth <= window.innerWidth (no
 *         horizontal overflow) at the served viewport width on / and /demo
 */

test.describe('Viewport meta tag — present on all routes', () => {
    test('should have viewport meta on the landing page (/)', async ({ page }) => {
        await page.goto('/');

        const content = await page.locator('head meta[name="viewport"]').getAttribute('content');
        // Must contain the two canonical directives (order-insensitive)
        expect(content).toMatch(/width=device-width/);
        expect(content).toMatch(/initial-scale=1/);
    });

    test('should have viewport meta on the demo page (/demo)', async ({ page }) => {
        await page.goto('/demo');

        const content = await page.locator('head meta[name="viewport"]').getAttribute('content');
        expect(content).toMatch(/width=device-width/);
        expect(content).toMatch(/initial-scale=1/);
    });
});

test.describe('No horizontal overflow — landing page (/)', () => {
    test('should have no horizontal scrollbar at the served viewport width', async ({ page }) => {
        await page.goto('/');
        // Wait for layout to settle (fonts, images)
        await page.waitForLoadState('networkidle');

        const overflows = await page.evaluate(() => {
            return {
                scrollWidth: document.documentElement.scrollWidth,
                innerWidth: window.innerWidth,
                overflow: document.documentElement.scrollWidth > window.innerWidth,
            };
        });

        expect(
            overflows.overflow,
            `Horizontal overflow detected: scrollWidth=${overflows.scrollWidth} > innerWidth=${overflows.innerWidth}`,
        ).toBe(false);
    });
});

test.describe('No horizontal overflow — demo output view (/demo)', () => {
    test('should have no horizontal scrollbar at the served viewport width', async ({ page }) => {
        await page.goto('/demo');
        // Wait for the DOM to be fully parsed and any synchronous layout work to complete.
        // We check for DOM presence (not CSS visibility) because the plan sections are wrapped
        // in framer-motion elements that start at opacity:0 — Playwright's toBeVisible()
        // would fail while the animation runs. We only need the DOM to exist for a layout
        // measurement; we do not need the elements to be visually visible.
        await page.waitForSelector('[data-section-id]', { state: 'attached', timeout: 10_000 });
        // Allow one rAF for layout to settle after initial paint
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

        const overflows = await page.evaluate(() => {
            return {
                scrollWidth: document.documentElement.scrollWidth,
                innerWidth: window.innerWidth,
                overflow: document.documentElement.scrollWidth > window.innerWidth,
            };
        });

        expect(
            overflows.overflow,
            `Horizontal overflow on /demo: scrollWidth=${overflows.scrollWidth} > innerWidth=${overflows.innerWidth}`,
        ).toBe(false);
    });
});
