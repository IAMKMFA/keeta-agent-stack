import { CTASection } from '../site/CTASection';

export function FinalCTASection() {
  return (
    <CTASection
      eyebrow="Get started"
      title="Run the stack locally in under ten minutes."
      description="Clone the repo, install with pnpm, and bring up the API, worker, and dashboard in mock mode. Live execution is one env flag away once you’ve provisioned a worker signer."
      primary={{
        label: 'Run it locally',
        href: 'https://github.com/IAMKMFA/keeta-agent-stack#quickstart',
      }}
      secondary={{
        label: 'Talk to maintainers',
        href: 'https://github.com/IAMKMFA/keeta-agent-stack/discussions',
      }}
    />
  );
}
