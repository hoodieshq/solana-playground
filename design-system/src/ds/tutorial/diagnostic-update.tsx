import { CircleAlert } from "lucide-react"

import {
  Diagnostic,
  DiagnosticCode,
  DiagnosticDescription,
  DiagnosticHeader,
  DiagnosticLine,
  DiagnosticMark,
  DiagnosticSource,
  DiagnosticTitle,
} from "@/components/ui/diagnostic"

import { Block } from "../parts"

function DiagnosticUpdateBlock() {
  return (
    <Block
      id="diagnostic-update"
      title="Diagnostic: the token marked"
      source="playground"
      registry="diagnostic"
      note="DiagnosticMark puts the compiler's wavy red line under the token it named, so the fault is marked where it is and not only by the line's edge. It draws in from the left, and is simply there with reduced motion. The same mark is CodeBlockMark in a code block."
      className="block"
    >
      <Diagnostic className="max-w-xl">
        <DiagnosticHeader>
          <CircleAlert />
          <DiagnosticTitle>initialize is missing its accounts</DiagnosticTitle>
          <DiagnosticCode>E0412</DiagnosticCode>
        </DiagnosticHeader>
        <DiagnosticDescription>The Context names a struct that does not exist yet.</DiagnosticDescription>
        <DiagnosticSource>
          <DiagnosticLine number={7} fault="cannot find type Initialize in this scope">
            {"    pub fn initialize(ctx: Context<"}
            <DiagnosticMark>Initialize</DiagnosticMark>
            {">) -> Result<()> {"}
          </DiagnosticLine>
        </DiagnosticSource>
      </Diagnostic>
    </Block>
  )
}

export { DiagnosticUpdateBlock }
