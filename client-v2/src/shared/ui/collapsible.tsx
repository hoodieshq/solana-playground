import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { Collapsible as CollapsiblePrimitive } from "radix-ui";

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  );
}

/* The fold's mark: points right when closed, down when open. Put it inside
   a CollapsibleTrigger. */
function CollapsibleChevron({
  className,
  ...props
}: React.ComponentProps<typeof ChevronRightIcon>) {
  return (
    <ChevronRightIcon
      data-slot="collapsible-chevron"
      aria-hidden="true"
      className={cn(
        "size-4 shrink-0 transition-transform duration-200 [[data-state=open]>&]:rotate-90 motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  );
}

export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  CollapsibleChevron,
};
