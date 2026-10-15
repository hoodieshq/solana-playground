import { useState } from "react";
import type { ReactNode } from "react";
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  Hammer,
  History,
} from "lucide-react";

import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { AsyncButton } from "@/shared/ui/async-button";
import { BrandButton } from "@/shared/ui/brand-button";
import { Button } from "@/shared/ui/button";
import {
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import {
  Diagnostic,
  DiagnosticCode,
  DiagnosticDescription,
  DiagnosticFooter,
  DiagnosticHeader,
  DiagnosticLine,
  DiagnosticSource,
  DiagnosticTitle,
} from "@/shared/ui/diagnostic";
import {
  StageEmpty,
  StageEmptyActions,
  StageEmptyDescription,
  StageEmptyMedia,
  StageEmptyMeta,
  StageEmptyTitle,
} from "@/shared/ui/stage-empty";
import { errorMeta, msLabel, warningCount } from "./build-view";
import type { BuildSurface } from "./build-surface";
import type { DiagnosticView } from "./build-view";
import { STAGE_BODY, STAGE_FOOT, STAGE_FRAME } from "./stage-layout";

export interface BaseBuildProps {
  surface: BuildSurface;
  /** A build is running; the surface stays, its action waits */
  building: boolean;
  /** The build server's host, for naming it */
  host: string;
  /** The last build's duration, `null` while unknown */
  ms: number | null;
  /** The failed surface's errors, in rustc's order */
  diagnostics: DiagnosticView[];
  /** The failed surface's count: the stepper's when none could be parsed */
  errorCount: number;
  /** The compiler's output, for the toggle under the errors */
  raw: string;
  onBuild: () => unknown;
  onContinue: () => void;
  onExport: () => unknown;
  /** Sends a prompt to the assistant */
  onFix: (prompt: string) => void;
  onOpenFile: (path: string) => void;
  /** Download IDL, shown with a successful build */
  idlActions: ReactNode;
}

/** What every surface is made of; the action row comes last */
const Surface = ({
  icon,
  title,
  meta,
  description,
  children,
  actions,
}: {
  icon: ReactNode;
  title: string;
  meta?: string | null;
  description?: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
}) => (
  <div className={STAGE_FRAME}>
    <StageEmpty className={STAGE_BODY}>
      <StageEmptyMedia>{icon}</StageEmptyMedia>
      <StageEmptyTitle>{title}</StageEmptyTitle>
      {meta && <StageEmptyMeta>{meta}</StageEmptyMeta>}
      {description && (
        <StageEmptyDescription>{description}</StageEmptyDescription>
      )}
      {children}
      <StageEmptyActions className={STAGE_FOOT}>{actions}</StageEmptyActions>
    </StageEmpty>
  </div>
);

/** The stage's own Build button, under whichever label the surface gives */
const BuildButton = ({
  p,
  label,
  variant,
}: {
  p: BaseBuildProps;
  label: string;
  variant?: "outline";
}) => (
  <AsyncButton
    variant={variant}
    loading={p.building}
    loadingText="Building..."
    onClick={p.onBuild}
    onError={reportButtonFailure}
  >
    {label}
  </AsyncButton>
);

const ContinueButton = ({ p }: { p: BaseBuildProps }) => (
  <BrandButton onClick={p.onContinue}>Continue to Deploy</BrandButton>
);

const Empty = (p: BaseBuildProps) => (
  <Surface
    icon={<Hammer />}
    title={p.building ? "Building..." : "Nothing built yet"}
    description={
      // A run in flight names the server and warns about the wait. The
      // Foundation's server took 381s on a cold first build and 2.9s on the
      // next one (measured 2026-09-21); six unexplained minutes read as a
      // hang, so say the first build is the slow one.
      p.building
        ? `Compiling on ${p.host}. A first build there can take several minutes.`
        : "Build compiles your program on the server. Nothing leaves your browser except the source."
    }
    actions={<BuildButton p={p} label="Build" />}
  />
);

const Unreached = (p: BaseBuildProps) => (
  <Surface
    icon={<CircleX className="text-error" />}
    title="Build failed"
    meta={msLabel(p.ms)}
    description={
      <>
        Build failed before the compiler ran - see the console. This usually
        means the build server could not be reached: {p.host}. Change it under
        Settings -&gt; Build server URL.
      </>
    }
    actions={<BuildButton p={p} label="Retry build" />}
  />
);

const Restored = (p: BaseBuildProps & { failed: boolean }) => (
  <Surface
    icon={<History />}
    title={p.failed ? "Last build failed" : "Built earlier"}
    description="This project was built before the page was reloaded, so the compiler's report is no longer here. Build again to see it."
    actions={
      <>
        <BuildButton p={p} label="Build" />
        {!p.failed && <ContinueButton p={p} />}
      </>
    }
  />
);

const Succeeded = (p: BaseBuildProps) => (
  <Surface
    icon={<CircleCheck className="text-success" />}
    title="Build succeeded"
    meta={msLabel(p.ms)}
    description="The IDL below reflects this build. Deploy when ready."
    actions={
      <>
        <ContinueButton p={p} />
        {p.idlActions}
        <AsyncButton
          variant="outline"
          onClick={p.onExport}
          onError={reportButtonFailure}
        >
          Export project
        </AsyncButton>
      </>
    }
  />
);

/** One compiler error. Only the first one's fix is the brand button */
const ErrorCard = ({
  view,
  first,
  p,
}: {
  view: DiagnosticView;
  first: boolean;
  p: BaseBuildProps;
}) => {
  const fix = () => p.onFix(view.prompt);
  const file = view.file;
  return (
    <Diagnostic>
      <DiagnosticHeader>
        <CircleAlert />
        <DiagnosticTitle>{view.title}</DiagnosticTitle>
        {view.code && <DiagnosticCode>{view.code}</DiagnosticCode>}
      </DiagnosticHeader>
      {view.explanation && (
        <DiagnosticDescription>{view.explanation}</DiagnosticDescription>
      )}
      {(view.lines || view.excerpt) && (
        <DiagnosticSource>
          {view.lines
            ? view.lines.map((line) => {
                const fault =
                  line.failing && view.label ? view.label : undefined;
                return (
                  <DiagnosticLine
                    key={line.num}
                    number={line.num}
                    fault={fault}
                  >
                    {line.text}
                  </DiagnosticLine>
                );
              })
            : view.excerpt}
        </DiagnosticSource>
      )}
      <DiagnosticFooter>
        {first ? (
          <BrandButton size="sm" onClick={fix}>
            Fix with assistant
          </BrandButton>
        ) : (
          <Button size="sm" variant="outline" onClick={fix}>
            Fix with assistant
          </Button>
        )}
        {file && (
          <Button size="sm" variant="ghost" onClick={() => p.onOpenFile(file)}>
            Open in editor
          </Button>
        )}
      </DiagnosticFooter>
    </Diagnostic>
  );
};

/** The compiler's own words, folded away under the errors */
const CompilerOutput = ({ raw }: { raw: string }) => {
  const [open, setOpen] = useState(false);
  const warnings = warningCount(raw);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm">
          <CollapsibleChevron data-icon="inline-start" />
          {open ? "Hide" : "Show"} compiler output
          {warnings > 0 && ` · ${warnings} warning${warnings === 1 ? "" : "s"}`}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-surface-well p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {raw}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
};

const Failed = (p: BaseBuildProps & { stderr: string }) => (
  <Surface
    icon={<CircleX className="text-error" />}
    title="Build failed"
    meta={errorMeta(p.errorCount, p.ms, p.host)}
    actions={<BuildButton p={p} label="Rebuild" variant="outline" />}
  >
    <div className="flex w-full flex-col gap-3.5">
      {p.diagnostics.length === 0 && (
        <ErrorCard
          first
          p={p}
          view={{
            code: null,
            title: "Unparsed compiler error",
            explanation:
              "The compiler reported an error without a parseable diagnostic; see raw output.",
            label: null,
            file: null,
            lines: null,
            excerpt: "",
            prompt:
              "Explain this build failure and propose a fix:\n" + p.stderr,
          }}
        />
      )}
      {p.diagnostics.map((view, i) => (
        <ErrorCard key={i} view={view} first={i === 0} p={p} />
      ))}
      <CompilerOutput raw={p.raw} />
    </div>
  </Surface>
);

/** The Build stage, drawn from props alone; `Build` connects it */
const BaseBuild = (p: BaseBuildProps) => {
  const s = p.surface;
  switch (s.kind) {
    case "empty":
      return <Empty {...p} />;
    case "unreached":
      return <Unreached {...p} />;
    case "restored":
      return <Restored {...p} failed={s.failed} />;
    case "succeeded":
      return <Succeeded {...p} />;
    case "failed":
      return <Failed {...p} stderr={s.stderr} />;
  }
};

export default BaseBuild;
