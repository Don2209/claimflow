import { demoSection } from '@/content/home';
import { lang } from '@/i18n/languages';
import { DemoSection } from '../shared/DemoSection';
import { BuiltFor } from './BuiltFor';
import { ClassesOfLoss } from './ClassesOfLoss';
import { FaqTeaser } from './FaqTeaser';
import { HowItWorks } from './HowItWorks';
import { HumanInLoop } from './HumanInLoop';
import { PilotBand } from './PilotBand';
import { SecurityTeaser } from './SecurityTeaser';
import { WhoFor } from './WhoFor';
import { WorksWithSystems } from './WorksWithSystems';

/** Everything after the problem section. Loaded as a separate chunk to keep first load light. */
export default function BelowFold() {
  return (
    <>
      <HowItWorks />
      {/* The interactive demo and FAQ are English only, so translated pages leave them out. */}
      {lang === 'en' && <DemoSection {...demoSection} />}
      <ClassesOfLoss />
      <BuiltFor />
      <WorksWithSystems />
      <HumanInLoop />
      <SecurityTeaser />
      <WhoFor />
      <PilotBand />
      {lang === 'en' && <FaqTeaser />}
    </>
  );
}
