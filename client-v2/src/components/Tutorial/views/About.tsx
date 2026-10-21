import { FC, Fragment, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";

import { BrandButton, BrandButtonIcon } from "@/shared/ui/brand-button";
import { Button } from "@/shared/ui/button";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import Link from "../../Link";
import Markdown from "../../Markdown";
import TutorialDetails from "../TutorialDetails";
import { PgTutorial } from "../../../utils";
import type { TutorialAboutComponentProps } from "../types";

export const About: FC<
  React.PropsWithChildren<TutorialAboutComponentProps>
> = ({ about, isStarted, start }) => {
  const tutorial = PgTutorial.current!;
  const isFinished = PgTutorial.completed;

  return (
    <div className="size-full overflow-auto">
      <div className="flex h-11 items-center px-2">
        <Button asChild variant="ghost">
          <RouterLink to="/tutorials">
            <ArrowLeftIcon data-icon="inline-start" />
            Go back to tutorials
          </RouterLink>
        </Button>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pt-8 pb-12 max-md:px-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-heading text-[clamp(2rem,3.2vw,3rem)] leading-[1.05] font-headline tracking-tight text-foreground">
              {tutorial.name}
            </h1>
            {tutorial.authors.length !== 0 && (
              <p className="mt-2 text-control font-read text-muted-foreground">
                by{" "}
                {tutorial.authors.map((author, i) => (
                  <Fragment key={i}>
                    {i !== 0 && ", "}
                    {author.link ? (
                      <Link href={author.link}>{author.name}</Link>
                    ) : (
                      <span>{author.name}</span>
                    )}
                  </Fragment>
                ))}
              </p>
            )}
          </div>

          <StartButton
            isFinished={isFinished}
            isStarted={isStarted}
            start={start}
          />
        </div>

        <p className="max-w-prose text-body font-read text-muted-foreground">
          {tutorial.description}
        </p>

        <TutorialDetails
          details={[
            { kind: "level", data: tutorial.level },
            { kind: "framework", data: tutorial.framework },
            { kind: "languages", data: tutorial.languages },
            // TODO: Enable once there are more tutorials with various categories
            // { kind: "categories", data: tutorial.categories },
          ]}
        />

        <div>
          {typeof about === "string" ? (
            <Markdown linkable>{about}</Markdown>
          ) : (
            about
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * The page's one action. The labels stay upper case: the e2e specs find the
 * button by its exact name (decided 2026-10-21).
 */
const StartButton: FC<
  Pick<TutorialAboutComponentProps, "isStarted" | "start"> & {
    isFinished: boolean | null;
  }
> = ({ isFinished, isStarted, start }) => {
  const [pending, setPending] = useState(false);

  const onClick = async () => {
    setPending(true);
    try {
      await start();
    } catch (error) {
      reportButtonFailure("start the tutorial")(error);
    } finally {
      setPending(false);
    }
  };

  if (isFinished) {
    return (
      <Button
        variant="ghost"
        className="text-success"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={onClick}
      >
        <CheckIcon data-icon="inline-start" />
        COMPLETED
      </Button>
    );
  }

  return (
    <BrandButton
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={onClick}
    >
      {isStarted ? "CONTINUE" : "START"}
      <BrandButtonIcon />
    </BrandButton>
  );
};
