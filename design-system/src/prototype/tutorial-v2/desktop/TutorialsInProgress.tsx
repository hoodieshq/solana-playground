import { LESSON } from "../data"
import { useFeatured, useOpenTutorial, useStartedLessons } from "../host"
import { LESSONS } from "../lessons"
import { progressOf, savedProgress, useStore } from "../store"
import { CATALOG } from "../ui/catalog"
import { ResumeList, type ResumeItem } from "../ui/ResumeList"
import { TutorialThumb } from "./TutorialList"

/** The lessons you started and left, under the banner. The banner's own lesson isn't repeated: it
 * already says Continue and the step it's on */
export function TutorialsInProgress() {
  const { s } = useStore()
  const featured = useFeatured()
  const open = useOpenTutorial()
  const items = useStartedLessons().flatMap((l): ResumeItem[] => {
    const lesson = LESSONS[l.slug]
    const t = CATALOG.find((c) => c.slug === l.slug)
    if (l.slug === featured || !lesson || !t) return []
    const n = lesson.steps.length
    const p = l.slug === LESSON.card.slug ? progressOf(s) : savedProgress(l.slug, n)
    if (p.finished) return []
    const first = lesson.steps.findIndex((_, i) => !p.passed[i])
    const where = first === -1 ? "Every step passed" : `Step ${first + 1} of ${n} · ${lesson.steps[first].title}`
    return [{ key: l.slug, cover: <TutorialThumb t={t} />, name: l.name, where, onOpen: () => open(l.slug) }]
  })
  // The page's gap and two more rem under it, as between two levels
  return <ResumeList id="tutorials-in-progress" title="In progress" items={items} className="mb-8" />
}
