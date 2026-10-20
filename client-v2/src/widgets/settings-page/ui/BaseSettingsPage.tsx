import { useEffect, useRef } from "react";
import type { ReactNode, Ref } from "react";
import { ChevronLeft } from "lucide-react";

import { cn } from "cn";
import { createLogger } from "@/shared/lib/logger";
import { Button } from "@/shared/ui/button";

const log = createLogger("settings-page:frame");

export interface SettingsSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface BaseSettingsPageProps {
  sections: SettingsSection[];
  /** The section marked as current in the list */
  current: string;
  /** A click in the list; the page brings the section into view itself */
  onPick: (id: string) => void;
  /** The section being read changed as the user scrolled */
  onCurrentChange: (id: string) => void;
  onBack: () => void;
  /** Below `LAYOUT_BREAKPOINTS.phone`: a bar instead of the section list */
  phone: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
}

const headingId = (id: string) => `settings-section-${id}`;

/**
 * The settings as a page of their own (design.md, "Settings as a full page
 * (5.20)"): "Back to app" over the section list at the left, the sections one
 * after another at the right. Fixed over the whole window, so the app beneath
 * it can stay mounted.
 */
const BaseSettingsPage = ({
  sections,
  current,
  onPick,
  onCurrentChange,
  onBack,
  phone,
  headingRef,
}: BaseSettingsPageProps) => {
  const scroller = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());

  // The section being read is the topmost one whose heading is in the upper
  // third of the scroller. Only on a wide window: a phone shows no list.
  const ids = sections.map((s) => s.id).join(" ");
  useEffect(() => {
    if (phone) return;
    if (typeof IntersectionObserver === "undefined") {
      log.debug("no IntersectionObserver: the list does not follow the scroll");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const seen = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = (seen[0]?.target as HTMLElement | undefined)?.dataset
          .section;
        if (id) onCurrentChange(id);
      },
      { root: scroller.current, rootMargin: "0px 0px -66% 0px" }
    );
    nodes.current.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
    // `onCurrentChange` is a fresh closure every render; the sections are
    // what the observer watches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, phone]);

  const pick = (id: string) => {
    onPick(id);
    nodes.current.get(id)?.scrollIntoView({ block: "start" });
  };

  const title = (
    <h1
      ref={headingRef}
      tabIndex={-1}
      className={cn(
        "font-semibold text-foreground outline-none",
        phone ? "text-base" : "text-2xl"
      )}
    >
      Settings
    </h1>
  );

  return (
    <div
      role="region"
      aria-label="Settings"
      className="fixed inset-0 z-40 flex bg-background text-foreground"
    >
      {!phone && (
        <aside className="flex w-58 shrink-0 flex-col border-r border-border">
          <div className="flex h-11 shrink-0 items-center border-b border-border px-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft data-icon="inline-start" />
              Back to app
            </Button>
          </div>
          <nav
            aria-label="Settings sections"
            className="flex flex-col gap-0.5 overflow-y-auto p-2"
          >
            {sections.map((s) => (
              <Button
                key={s.id}
                variant="ghost"
                size="sm"
                aria-current={s.id === current ? "true" : undefined}
                className="justify-start aria-[current=true]:bg-accent aria-[current=true]:text-accent-foreground"
                onClick={() => pick(s.id)}
              >
                {s.title}
              </Button>
            ))}
          </nav>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {phone && (
          <div
            data-testid="settings-bar"
            className="flex h-phone-bar shrink-0 items-center gap-2 border-b border-border px-2"
          >
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to app"
              onClick={onBack}
            >
              <ChevronLeft />
            </Button>
            {title}
          </div>
        )}
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto flex max-w-xl flex-col",
              phone ? "gap-8 px-5 py-6" : "gap-10 px-6 py-10"
            )}
          >
            {!phone && title}
            {sections.map((s) => (
              <section
                key={s.id}
                data-section={s.id}
                aria-labelledby={headingId(s.id)}
                className="flex scroll-mt-6 flex-col gap-3"
                ref={(node) => {
                  if (node) nodes.current.set(s.id, node);
                  else nodes.current.delete(s.id);
                }}
              >
                <h2
                  id={headingId(s.id)}
                  className="border-b border-border pb-2 text-base font-semibold text-foreground"
                >
                  {s.title}
                </h2>
                {s.content}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseSettingsPage;
