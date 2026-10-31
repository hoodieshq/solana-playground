import * as React from "react"

import { AchievementUpdateBlock } from "./achievement-update"
import { ActionCardUpdateBlock } from "./action-card-update"
import { BrandButtonUpdateBlock } from "./brand-button-update"
import { BrandIconBlock } from "./brand-icon"
import { ButtonUpdateBlock } from "./button-update"
import { CallFormBlock } from "./call-form"
import { CheckListBlock } from "./check-list"
import { CoachMarkBlock } from "./coach-mark"
import { CodeBlockUpdateBlock } from "./code-block-update"
import { CodeQuoteBlock } from "./code-quote"
import { ComposerUpdateBlock } from "./composer-update"
import { ConsoleDrawerUpdateBlock } from "./console-drawer-update"
import { DiagnosticUpdateBlock } from "./diagnostic-update"
import { DiffUpdateBlock } from "./diff-update"
import { EditorTabsUpdateBlock } from "./editor-tabs-update"
import { FeatureBannerBlock } from "./feature-banner"
import { FileChangeBlock } from "./file-change"
import { FileTreeBlock } from "./file-tree"
import { FilterButtonBlock } from "./filter-button"
import { IsoVoxelsBlock } from "./iso-voxels"
import { KeyRowBlock } from "./key-row"
import { LessonIntroBlock } from "./lesson-intro"
import { LitGroundBlock } from "./lit-ground"
import { MeterBlock } from "./meter"
import { MilestoneBlock } from "./milestone"
import { PhoneBarBlock } from "./phone-bar"
import { PhoneNavBlock } from "./phone-nav"
import { ProseBlock } from "./prose"
import { QuizBlock } from "./quiz"
import { ReceiptBlock } from "./receipt"
import { ResultCardBlock } from "./result-card"
import { ResultDetailsBlock } from "./result-details"
import { RunCardBlock } from "./run-card"
import { ScrollEdgesBlock } from "./scroll-edges"
import { SearchFieldBlock } from "./search-field"
import { SegmentedUpdateBlock } from "./segmented-update"
import { ShortcutListBlock } from "./shortcut-list"
import { SourcePeekBlock } from "./source-peek"
import { StepHeadingBlock } from "./step-heading"
import { StepTrackBlock } from "./step-track"
import { TerminalUpdateBlock } from "./terminal-update"
import { ThumbBlock } from "./thumb"
import { ToolButtonBlock } from "./tool-button"
import { TooltipUpdateBlock } from "./tooltip-update"
import { TutorialCoverBlock } from "./tutorial-cover"
import { UseTypewriterBlock } from "./use-typewriter"

/* What the tutorial work added to the library, in one section: the new parts
   by where they live in a lesson, then the hooks, then what it added to parts
   that were here before. The small headings are for reading only; the side
   nav lists the blocks under the section as it does everywhere else. */

function Part({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="pt-10 first:pt-2">
      <h5 className="text-caption font-label text-brand-purple">{title}</h5>
      <p className="mt-1 max-w-2xl text-caption font-read text-subtle">{note}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function TutorialComponents() {
  return (
    <>
      <Part title="Chat cards" note="What the lesson says and asks in the conversation, and how each card folds to a line once it is done with.">
        <LessonIntroBlock />
        <StepHeadingBlock />
        <ProseBlock />
        <CheckListBlock />
        <QuizBlock />
        <RunCardBlock />
        <ResultCardBlock />
        <ResultDetailsBlock />
        <MilestoneBlock />
      </Part>

      <Part title="Transactions and code" note="What a run leaves behind, and code quoted, changed or peeked at from the chat.">
        <KeyRowBlock />
        <ReceiptBlock />
        <CodeQuoteBlock />
        <FileChangeBlock />
        <SourcePeekBlock />
      </Part>

      <Part title="Navigation and forms" note="Getting round a lesson and its files, calling the program, and the keys for all of it.">
        <StepTrackBlock />
        <FileTreeBlock />
        <CallFormBlock />
        <MeterBlock />
        <ToolButtonBlock />
        <FilterButtonBlock />
        <SearchFieldBlock />
        <CoachMarkBlock />
        <ShortcutListBlock />
      </Part>

      <Part title="Brand and phone" note="The tutorial gallery's covers and banner, and the bars of the phone layout.">
        <BrandIconBlock />
        <TutorialCoverBlock />
        <ThumbBlock />
        <IsoVoxelsBlock />
        <LitGroundBlock />
        <FeatureBannerBlock />
        <PhoneBarBlock />
        <PhoneNavBlock />
      </Part>

      <Part title="Hooks" note="Behaviour the parts above share, installed on its own when a part needs it.">
        <ScrollEdgesBlock />
        <UseTypewriterBlock />
      </Part>

      <Part title="Updated in the tutorial work" note="New variants and props on parts that were already here. Each default renders exactly as before; the new options sit next to it.">
        <ButtonUpdateBlock />
        <TooltipUpdateBlock />
        <SegmentedUpdateBlock />
        <BrandButtonUpdateBlock />
        <ActionCardUpdateBlock />
        <AchievementUpdateBlock />
        <ComposerUpdateBlock />
        <EditorTabsUpdateBlock />
        <ConsoleDrawerUpdateBlock />
        <TerminalUpdateBlock />
        <CodeBlockUpdateBlock />
        <DiagnosticUpdateBlock />
        <DiffUpdateBlock />
      </Part>
    </>
  )
}

export { TutorialComponents }
