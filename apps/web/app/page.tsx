import type { Metadata } from 'next';
import { HeroSection } from '../components/sections/HeroSection';
import { TrustStrip } from '../components/sections/TrustStrip';
import { AgentPipelineSection } from '../components/sections/AgentPipelineSection';
import { CapabilityGrid } from '../components/sections/CapabilityGrid';
import { InteractiveDemoSection } from '../components/sections/InteractiveDemoSection';
import { DeveloperQuickstart } from '../components/sections/DeveloperQuickstart';
import { ArchitectureSection } from '../components/sections/ArchitectureSection';
import { SecurityModelSection } from '../components/sections/SecurityModelSection';
import { UseCasesSection } from '../components/sections/UseCasesSection';
import { EcosystemSection } from '../components/sections/EcosystemSection';
import { FAQSection } from '../components/sections/FAQSection';
import { FinalCTASection } from '../components/sections/FinalCTASection';
import { buildMetadata } from '../lib/seo';

export const metadata: Metadata = buildMetadata({ path: '/' });

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustStrip />
      <AgentPipelineSection />
      <CapabilityGrid />
      <InteractiveDemoSection />
      <DeveloperQuickstart />
      <ArchitectureSection />
      <SecurityModelSection />
      <UseCasesSection />
      <EcosystemSection />
      <FAQSection />
      <FinalCTASection />
    </>
  );
}
