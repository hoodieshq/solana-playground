import * as React from "react";

import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";

/* A Button that waits for its own work. Give it an onClick that returns a
   promise and it disables itself and shows a spinner until the promise
   settles, so a slow build cannot be started twice. loading takes over when
   the wait is known elsewhere. A rejection or a throw goes to onError; with
   no onError it is rethrown, so it surfaces as an unhandled
   rejection. It stays a Button: same
   variants, same slot. */
function AsyncButton({
  onClick,
  onError,
  loading: loadingProp,
  loadingText,
  disabled,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick" | "onError"> & {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => unknown;
  /** where a failed click goes; without it the failure is rethrown */
  onError?: (error: unknown) => void;
  loading?: boolean;
  /** what the button says while it waits, e.g. "Building" */
  loadingText?: React.ReactNode;
}) {
  const [pending, setPending] = React.useState(false);
  const loading = loadingProp ?? pending;
  return (
    <Button
      data-async=""
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      onClick={async (event) => {
        try {
          const result = onClick?.(event);
          if (
            typeof (result as PromiseLike<unknown> | undefined)?.then ===
            "function"
          ) {
            setPending(true);
            await (result as PromiseLike<unknown>);
          }
        } catch (error) {
          if (!onError) throw error;
          onError(error);
        } finally {
          setPending(false);
        }
      }}
      {...props}
    >
      {loading && <Spinner data-icon="inline-start" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}

export { AsyncButton };
