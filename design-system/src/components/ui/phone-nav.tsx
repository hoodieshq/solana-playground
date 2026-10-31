import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Menu, X } from "lucide-react"
import { Dialog as DialogPrimitive, Slot } from "radix-ui"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PhoneBar, PhoneBarStart } from "@/components/ui/phone-bar"

/* The product's navigation on a phone. The menu button opens the desktop
   sidebar's rows over the whole screen, and the X takes the menu button's
   own spot, so the same tap closes it. Nothing of the page shows behind, so
   the layer runs under the status bar too and needs no scrim. Destinations
   first, then a group such as projects, then a foot row (the network, the
   account) over the home indicator. The groups drop in 40ms apart; with
   reduced motion only the layer's fade is left. Choosing a row closes the
   layer. */

function PhoneNav(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="phone-nav" {...props} />
}

/* The menu button, 44px for the thumb. Children replace the glyph. */
function PhoneNavTrigger({
  className,
  children,
  "aria-label": ariaLabel = "Menu",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <DialogPrimitive.Trigger asChild>
      <Button
        data-slot="phone-nav-trigger"
        variant="ghost"
        size="icon"
        aria-label={ariaLabel}
        className={cn("size-11", className)}
        {...props}
      >
        {children ?? <Menu strokeWidth={1.75} className="size-6" />}
      </Button>
    </DialogPrimitive.Trigger>
  )
}

/* The X on the menu button's spot, turning in as the layer opens. */
function PhoneNavClose({
  className,
  children,
  "aria-label": ariaLabel = "Close menu",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <DialogPrimitive.Close asChild>
      <Button
        data-slot="phone-nav-close"
        variant="ghost"
        size="icon"
        aria-label={ariaLabel}
        className={cn("size-11", className)}
        {...props}
      >
        {children ?? (
          <X
            strokeWidth={1.75}
            className="size-6 animate-in spin-in-[-90deg] fade-in-0 duration-[160ms] ease-out motion-reduce:animate-none"
          />
        )}
      </Button>
    </DialogPrimitive.Close>
  )
}

/* The layer, with the page's own column inside, so the X sits exactly on
   the menu button. No row takes the focus on open: a tap had the first one
   ringed as if it were the page. The layer holds the focus instead, so Tab
   still starts at the top. title names the dialog for a screen reader. */
function PhoneNavContent({
  className,
  children,
  title = "Menu",
  closeLabel,
  onOpenAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title?: string; closeLabel?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Content
        data-slot="phone-nav-content"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          onOpenAutoFocus?.(e)
          if (e.defaultPrevented) return
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).focus()
        }}
        className={cn(
          "fixed inset-0 z-50 bg-surface-base pt-[env(safe-area-inset-top)] text-foreground outline-none data-open:animate-in data-open:fade-in-0 data-open:duration-200 data-open:ease-out data-closed:animate-out data-closed:fade-out-0 data-closed:duration-150 data-closed:ease-in motion-reduce:duration-100!",
          className
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        <div className="mx-auto flex h-full w-full max-w-[30rem] flex-col">
          <PhoneBar>
            <PhoneBarStart>
              <PhoneNavClose aria-label={closeLabel} />
            </PhoneBarStart>
          </PhoneBar>
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/* The rows, scrolling under the bar and over the foot. */
function PhoneNavBody({ className, "aria-label": ariaLabel = "Main", ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="phone-nav-body"
      aria-label={ariaLabel}
      className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 pt-1 pb-4", className)}
      {...props}
    />
  )
}

/* Each group drops in 8px behind the one above it. */
const ENTER =
  "animate-in fade-in-0 slide-in-from-top-2 duration-200 ease-out fill-mode-both motion-reduce:animate-none"

function PhoneNavGroup({
  className,
  label,
  children,
  ...props
}: React.ComponentProps<"div"> & { label?: React.ReactNode }) {
  const labelId = React.useId()
  return (
    <div
      data-slot="phone-nav-group"
      role={label ? "group" : undefined}
      aria-labelledby={label ? labelId : undefined}
      className={cn(ENTER, "nth-2:delay-40 nth-3:delay-80 nth-4:delay-120", className)}
      {...props}
    >
      {label && (
        <p id={labelId} data-slot="phone-nav-group-label" className="mt-6 mb-1 px-2 text-caption text-muted-foreground">
          {label}
        </p>
      )}
      {children}
    </div>
  )
}

/* The desktop sidebar's row at a thumb's size: glyph and label, the current
   one on a filled pill. The 8px inset puts every glyph on the page's 16px
   edge. lg is for the destinations, default for the rows under them. */
const phoneNavItemVariants = cva(
  "flex w-full items-center gap-3 rounded-lg px-2 text-left text-muted-foreground transition-colors outline-none active:bg-foreground/[0.05] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple aria-[current=page]:bg-surface-hover aria-[current=page]:font-medium aria-[current=page]:text-foreground in-data-[slot=phone-nav-footer]:w-auto in-data-[slot=phone-nav-footer]:gap-2.5",
  {
    variants: {
      size: {
        default: "h-11 text-[0.9375rem]",
        lg: "h-12 text-[1.0625rem]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function PhoneNavItem({
  className,
  size = "default",
  icon,
  current = false,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof phoneNavItemVariants> & { icon?: React.ReactNode; current?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <DialogPrimitive.Close asChild>
      <Comp
        data-slot="phone-nav-item"
        data-size={size}
        type={asChild ? undefined : "button"}
        aria-current={current ? "page" : undefined}
        className={cn(phoneNavItemVariants({ size }), className)}
        {...props}
      >
        {icon && (
          <span
            data-slot="phone-nav-item-icon"
            aria-hidden="true"
            className="flex size-5 shrink-0 items-center justify-center [&>svg]:size-full"
          >
            {icon}
          </span>
        )}
        <Slot.Slottable>{children}</Slot.Slottable>
      </Comp>
    </DialogPrimitive.Close>
  )
}

/* The network and the account share one row under a rule, clear of the
   home indicator. */
function PhoneNavFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="phone-nav-footer"
      className={cn(
        ENTER,
        "flex h-[calc(56px+var(--safe-bottom))] shrink-0 items-start justify-between border-t border-border px-2 pt-1.5 delay-80",
        className
      )}
      {...props}
    />
  )
}

export {
  PhoneNav,
  PhoneNavBody,
  PhoneNavClose,
  PhoneNavContent,
  PhoneNavFooter,
  PhoneNavGroup,
  PhoneNavItem,
  PhoneNavTrigger,
  phoneNavItemVariants,
}
