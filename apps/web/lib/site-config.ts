import { publicEnv } from './env';

/**
 * Single source of truth for canonical URLs and external links the site
 * uses. External URLs are constants here so they can be audited at a
 * glance; nothing in this file may reference operator credentials,
 * signing seeds, or admin tokens.
 */

export const REPO_URL = 'https://github.com/IAMKMFA/keeta-agent-stack';

const FALLBACK_DOCS_URL = `${REPO_URL}#readme`;
const FALLBACK_DASHBOARD_URL = `${REPO_URL}/tree/main/apps/dashboard`;

export const siteConfig = {
  name: 'Keeta Agent Stack',
  shortName: 'Agent Stack',
  tagline: 'The execution layer for autonomous financial agents.',
  description:
    'Keeta Agent Stack turns intent into safe, explainable execution — quote, route, policy-check, simulate, execute, and audit in real time.',
  url: 'https://keeta-agent-stack.dev',
  ogImage: '/brand/og-default.svg',
  themeColor: '#080b0f',
  repoUrl: REPO_URL,
  licenseUrl: `${REPO_URL}/blob/main/LICENSE`,
  contributingUrl: `${REPO_URL}/blob/main/CONTRIBUTING.md`,
  securityUrl: `${REPO_URL}/blob/main/SECURITY.md`,
  changelogUrl: `${REPO_URL}/blob/main/CHANGELOG.md`,
  discussionsUrl: `${REPO_URL}/discussions`,
  issuesUrl: `${REPO_URL}/issues`,
  advisoriesUrl: `${REPO_URL}/security/advisories/new`,
  docsUrl: publicEnv.docsUrl ?? FALLBACK_DOCS_URL,
  dashboardUrl: publicEnv.dashboardUrl ?? FALLBACK_DASHBOARD_URL,
  apiSwaggerLocalUrl: 'http://localhost:3001/docs',
  openApiLocalUrl: 'http://localhost:3001/openapi.json',
} as const;

export type SiteConfig = typeof siteConfig;
