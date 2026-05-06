export interface NavLink {
  readonly label: string;
  readonly href: string;
  readonly description?: string;
}

export const primaryNav: ReadonlyArray<NavLink> = [
  { label: 'Stack', href: '/stack', description: 'Every layer of the agent execution stack.' },
  {
    label: 'Developers',
    href: '/developers',
    description: 'SDK, API, MCP, and starter templates.',
  },
  {
    label: 'Demo',
    href: '/demo',
    description: 'Watch the Intent → Audit pipeline run end-to-end.',
  },
  {
    label: 'Security',
    href: '/security',
    description: 'Custody guardrails, signing, and policy posture.',
  },
  {
    label: 'Use Cases',
    href: '/use-cases',
    description: 'Where teams put autonomous agents to work.',
  },
  { label: 'Docs', href: '/docs', description: 'API reference, guides, and Typedoc output.' },
];

export const footerNav: ReadonlyArray<{
  readonly heading: string;
  readonly links: ReadonlyArray<NavLink>;
}> = [
  {
    heading: 'Product',
    links: [
      { label: 'Stack overview', href: '/stack' },
      { label: 'Use cases', href: '/use-cases' },
      { label: 'Live demo', href: '/demo' },
    ],
  },
  {
    heading: 'Developers',
    links: [
      { label: 'Quickstart', href: '/developers' },
      { label: 'Documentation hub', href: '/docs' },
      { label: 'GitHub', href: 'https://github.com/IAMKMFA/keeta-agent-stack' },
    ],
  },
  {
    heading: 'Trust',
    links: [
      { label: 'Security model', href: '/security' },
      {
        label: 'Security policy',
        href: 'https://github.com/IAMKMFA/keeta-agent-stack/blob/main/SECURITY.md',
      },
      {
        label: 'Report a vulnerability',
        href: 'https://github.com/IAMKMFA/keeta-agent-stack/security/advisories/new',
      },
    ],
  },
];
