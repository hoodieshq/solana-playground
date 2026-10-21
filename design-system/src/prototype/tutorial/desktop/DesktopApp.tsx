import { useStore } from "../store"

export function DesktopApp() {
  const { s } = useStore()
  return <div className="grid h-dvh place-items-center bg-surface-base text-muted-foreground">Desktop · {s.screen}</div>
}
