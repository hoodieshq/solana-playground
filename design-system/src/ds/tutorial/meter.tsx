import { HardDrive, MemoryStick, Zap } from "lucide-react"

import { Meter, MeterLabel, MeterTrack, MeterValue } from "@/components/ui/meter"

import { Block, More } from "../parts"

const KB = 1024

function MeterMore() {
  return (
    <More label="An account card: rows share one grid, so labels, tracks and values line up">
      <div className="grid w-80 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-control border border-border bg-surface-well px-3 py-2.5">
        <Meter value={20 * KB} max={40 * KB} cells={4} className="contents">
          <MeterLabel>
            <HardDrive aria-hidden="true" />
            Account
          </MeterLabel>
          <MeterTrack />
          <MeterValue className="text-right">20 KB / 40 KB</MeterValue>
        </Meter>
        <Meter value={20 * KB} max={40 * KB} variant="bar" tone="neutral" threshold={32 * KB} className="contents">
          <MeterLabel>
            <MemoryStick aria-hidden="true" />
            Heap
          </MeterLabel>
          <MeterTrack />
          <MeterValue className="text-right">20 KB / 32 KB</MeterValue>
        </Meter>
      </div>
    </More>
  )
}

function MeterBlock() {
  return (
    <Block
      id="meter"
      title="Meter"
      source="playground"
      registry="meter"
      more={<MeterMore />}
      note="A value against its most, read at a glance. cells counts it out in short bars, one per unit or as many as cells says (a game's energy, an account's size in 10 KB blocks). bar is one line with a threshold tick, and the fill turns red past it (what a read takes from a 32 KB heap). brand fills green, neutral grey. The number beside it carries the value; role=meter with aria-valuenow, labelled by MeterLabel. alertEmpty turns an empty meter red."
    >
      <Meter value={3} max={5} alertEmpty>
        <MeterLabel>
          <Zap aria-hidden="true" className="text-brand-green" />
          Energy
        </MeterLabel>
        <MeterTrack />
        <MeterValue />
      </Meter>
      <Meter value={0} max={5} alertEmpty>
        <MeterLabel>
          <Zap aria-hidden="true" />
          Energy
        </MeterLabel>
        <MeterTrack />
        <MeterValue />
      </Meter>
      <Meter value={20} max={40} variant="bar" tone="neutral" threshold={32} className="w-64">
        <MeterLabel>Heap</MeterLabel>
        <MeterTrack />
        <MeterValue>20 KB / 32 KB</MeterValue>
      </Meter>
      <Meter value={40} max={40} variant="bar" tone="neutral" threshold={32} className="w-64">
        <MeterLabel>Heap</MeterLabel>
        <MeterTrack />
        <MeterValue>40 KB / 32 KB</MeterValue>
      </Meter>
    </Block>
  )
}

export { MeterBlock }
