import { test, expect, Page } from '@playwright/test';
import { login } from '../../utils/login';
import { resetDatabaseAndImportDataFromPath } from '../../utils/dts-import';
import { clickAndWait, describeOnCondition, findAndClose, skipCtbTour } from '../../utils/shared';
import { resetFiles } from '../../utils/file-reset';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Preview', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabaseAndImportDataFromPath('with-admin.tar', (cts) => cts, { coreStore: false });
    await resetFiles();
    await page.goto('/admin');
    await page.evaluate(() => window.localStorage.setItem('GUIDED_TOUR_SKIPPED', 'true'));
    await login({ page });
    await page.waitForURL('/admin');
  });

  test('Preview button should appear for configured content types', async ({ page, context }) => {
    // Open an edit view for a content type that has preview
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: /west ham post match/i }));

    // Check that preview opens in its own page
    await clickAndWait(page, page.getByRole('link', { name: /open preview/i }));
    // Draft status is visible (second Draft text is the draft tab)
    await expect(page.getByText(/^Draft$/).nth(0)).toBeVisible();
    await expect(page.getByRole('heading', { name: /west ham post match/i })).toBeVisible();

    // Copies the link of the page
    await page.getByRole('button', { name: /copy preview link/i }).click();
    await findAndClose(page, 'Copied preview link');

    // Should go back to the edit view on close
    await clickAndWait(page, page.getByRole('link', { name: /close preview/i }));
    await expect(page.getByRole('textbox', { name: /title/i })).toBeVisible();
  });

  test('Preview button should not appear for content types without preview config', async ({
    page,
  }) => {
    // Open an edit view for a content type that does not have preview
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Product' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: /nike mens/i }));

    await expect(page.getByRole('link', { name: /open preview/i })).not.toBeVisible();
  });

  test('Tabs for Draft and Publish should be visible for content type with D&P enabled', async ({
    page,
  }) => {
    // Navigate to the Content Manager and open the edit view of a content type with D&P enabled
    await clickAndWait(page, page.getByRole('link', { name: 'Content Manager' }));
    await clickAndWait(page, page.getByRole('link', { name: 'Article' }));
    await clickAndWait(page, page.getByRole('gridcell', { name: /west ham post match/i }));

    // Check that preview opens in its own page
    await clickAndWait(page, page.getByRole('link', { name: /open preview/i }));
    // Draft status is visible (second Draft text is the draft tab)
    await expect(page.getByText(/^Draft$/).nth(0)).toBeVisible();
    await expect(page.getByRole('heading', { name: /west ham post match/i })).toBeVisible();

    // Verify that Draft and Publish tabs are visible
    await expect(page.getByRole('tab', { name: /^Draft$/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Published$/ })).toBeVisible();

    // Expect the preview tab to be disabled (since the document is in draft status)
    await expect(page.getByText(/^Published$/)).toBeDisabled();
  });
});
