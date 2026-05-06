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

const primaryRoutes = [
  { label: 'Stack', path: '/stack', heading: /one repo/i },
  { label: 'Developers', path: '/developers', heading: /four entrypoints/i },
  { label: 'Demo', path: '/demo', heading: /drive the whole pipeline/i },
  { label: 'Security', path: '/security', heading: /underclaim\. overprove\. cite/i },
  { label: 'Use Cases', path: '/use-cases', heading: /real flows/i },
  { label: 'Docs', path: '/docs', heading: /hub, not a duplication/i },
];

test('primary nav links exist and route', async ({ page }) => {
  const failures = collectConsoleFailures(page);

  await page.goto('/');

  for (const route of primaryRoutes) {
    await expect(
      page.getByRole('navigation', { name: /primary/i }).getByRole('link', {
        name: route.label,
      })
    ).toBeVisible();
  }

  for (const route of primaryRoutes) {
    await page
      .getByRole('navigation', { name: /primary/i })
      .getByRole('link', {
        name: route.label,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${route.path}$`));
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
  }

  expect(failures).toEqual([]);
});

test('security and docs render directly without console errors', async ({ page }) => {
  const failures = collectConsoleFailures(page);

  await page.goto('/security');
  await expect(page.getByRole('heading', { name: /underclaim\. overprove\. cite/i })).toBeVisible();

  await page.goto('/docs');
  await expect(page.getByRole('heading', { name: /hub, not a duplication/i })).toBeVisible();

  expect(failures).toEqual([]);
});
