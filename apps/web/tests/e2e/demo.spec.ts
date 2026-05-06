import { expect, test } from '@playwright/test';

const collectConsoleFailures = (page) => {
  const failures = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      failures.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    failures.push(error.message);
  });

  return failures;
};

test('/demo renders the demo surface in safe demo mode', async ({ page }) => {
  const failures = collectConsoleFailures(page);

  await page.goto('/demo');

  await expect(page.getByRole('heading', { name: /drive the whole pipeline/i })).toBeVisible();
  await expect(page.getByText(/pipeline · deterministic fixtures/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /settlement rails/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /public api probes/i })).toBeVisible();
  await expect(page.getByText(/live mode only checks public, read-only endpoints/i)).toBeVisible();
  await expect(page.getByText(/health/i).first()).toBeVisible();
  await expect(page.getByText(/openapi/i).first()).toBeVisible();
  expect(failures).toEqual([]);
});

test('/demo reduced-motion render stays intact', async ({ page }) => {
  const failures = collectConsoleFailures(page);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demo');

  await expect(page.getByRole('heading', { name: /drive the whole pipeline/i })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /what live mode does and does not do/i })
  ).toBeVisible();
  expect(failures).toEqual([]);
});
