import { useEffect, useState } from "react"

import { Modal, ModalBody, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Segmented, SegmentedCount, SegmentedItem } from "@/components/ui/segmented"

import { CATALOG, filterCatalog } from "../ui/catalog"
import { emit, on } from "../ui/events"
import { filterPrograms, PROGRAMS } from "../ui/programs"
import { CatalogSearch, NoMatch, ProgramGrid, StartFromScratch, TutorialTile } from "./Catalog"

type Tab = "tutorials" | "programs"

/** Opens New project from anywhere: the nav's row asks through the event bus */
export const openNewProject = () => emit("new-project:open")

/** "What do you want to build?", as client-v2's NewProject in its modal (scope/interface-2): start
 * from scratch, then Tutorials and Programs as one choice with a count each beside the search, then
 * the chosen list. A tutorial opens its lesson and closes the dialog; the rest say they're not here */
export function NewProject() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("tutorials")
  const [query, setQuery] = useState("")
  useEffect(() =>
    on("new-project:open", () => {
      setTab("tutorials")
      setQuery("")
      setOpen(true)
    })
  )

  const tutorials = filterCatalog(query, "all")
  const programs = filterPrograms(query)
  const empty = tab === "tutorials" ? !tutorials.length : !programs.length

  return (
    <Modal open={open} onOpenChange={setOpen}>
      <ModalContent size="wide">
        <ModalHeader>
          <ModalTitle>What do you want to build?</ModalTitle>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <ModalDescription className="text-control font-read text-muted-foreground">
            Start clean, open a real program, or learn through a tutorial. Everything stays in this browser until you deploy.
          </ModalDescription>
          <StartFromScratch />
          <div className="flex flex-wrap items-center gap-3">
            <Segmented variant="boxed" aria-label="Gallery source" value={tab} onValueChange={(next) => next && setTab(next as Tab)}>
              <SegmentedItem value="tutorials">
                Tutorials
                <SegmentedCount>{CATALOG.length}</SegmentedCount>
              </SegmentedItem>
              <SegmentedItem value="programs">
                Programs
                <SegmentedCount>{PROGRAMS.length}</SegmentedCount>
              </SegmentedItem>
            </Segmented>
            <CatalogSearch label={tab} query={query} onQuery={setQuery} icon={false} className="max-w-none min-w-40 flex-1" />
          </div>
          {empty && <NoMatch label={tab} query={query} onClear={() => setQuery("")} />}
          {!empty && tab === "tutorials" && (
            <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
              {tutorials.map((t) => (
                <TutorialTile key={t.slug} t={t} onOpened={() => setOpen(false)} />
              ))}
            </div>
          )}
          {!empty && tab === "programs" && <ProgramGrid programs={programs} />}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
