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

test('homepage loads with hero CTAs and no obvious console errors', async ({ page }) => {
  const failures = collectConsoleFailures(page);

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /execution layer for autonomous financial agents/i })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /explore the stack/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /run the demo/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /read the docs/i })).toBeVisible();
  await expect(page.getByText(/interactive demo/i).first()).toBeVisible();
  await expect(page.getByText(/default site posture is demo mode/i)).toBeVisible();
  expect(failures).toEqual([]);
});

test('homepage renders when reduced motion is requested', async ({ page }) => {
  const failures = collectConsoleFailures(page);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /execution layer for autonomous financial agents/i })
  ).toBeVisible();
  await expect(page.locator('#demo')).toBeVisible();
  expect(failures).toEqual([]);
});
