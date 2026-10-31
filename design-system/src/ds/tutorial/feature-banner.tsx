import { ArrowRight } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import {
  FeatureBanner,
  FeatureBannerActions,
  FeatureBannerAside,
  FeatureBannerCode,
  FeatureBannerContent,
  FeatureBannerDescription,
  FeatureBannerDither,
  FeatureBannerEyebrow,
  FeatureBannerMeta,
  FeatureBannerProgress,
  FeatureBannerTitle,
} from "@/components/ui/feature-banner"
import { IsoVoxels } from "@/components/ui/iso-voxels"

import { Block, More } from "../parts"

/* Lines 9 to 12 of src/lib.rs as the first step leaves them, coloured with the syntax tokens */
const CODE = [
  {
    number: 9,
    code: (
      <>
        <span className="text-syntax-keyword">pub fn</span> <span className="text-syntax-function">hello</span>(_ctx:{" "}
        <span className="text-syntax-type">Context</span>&lt;<span className="text-syntax-type">Hello</span>&gt;) -&gt;{" "}
        <span className="text-syntax-type">Result</span>&lt;()&gt; {"{"}
      </>
    ),
  },
  {
    number: 10,
    code: (
      <>
        {"    "}
        <span className="text-syntax-function">msg!</span>(<span className="text-syntax-string">"Hello, World!"</span>);
      </>
    ),
  },
  { number: 11, code: <>{"    "}Ok(())</> },
  { number: 12, code: "}" },
]

function FeatureBannerBlock() {
  return (
    <Block
      id="feature-banner"
      title="Feature banner"
      source="playground"
      registry="feature-banner"
      note="The banner at the top of a gallery: the one thing a newcomer starts with. A state line, the title, one line of what it is, then how far along you are or the facts that decide a start, and the actions: the brand button (hover beam), and a quiet button with an arrow when there is a second thing to do. Art sits behind the words: the voxel sculpture, the dither, or anything else. From 640px wide it stands beside the words; under that it hangs in the top right corner and the words run under it. Under 28rem the first brand button takes the width at 48px. A picture that needs a column of its own, such as the code picture, goes in the aside, from 44rem. glow is the panel with a soft light of purple from the art's corner; tint mixes purple into the panel and rings it. Every word comes in as children."
      className="grid gap-3 md:grid-cols-2"
      more={
        <More label="Tint, with the dither behind and the code picture beside" className="flex-col flex-nowrap items-stretch">
          <FeatureBanner surface="tint" art={({ wide }) => <FeatureBannerDither field={wide ? "side" : "corner"} />}>
            <FeatureBannerContent>
              <FeatureBannerEyebrow>Start here</FeatureBannerEyebrow>
              <FeatureBannerTitle className="text-[2rem] leading-[1.1] tracking-[-0.02em]">Hello Anchor</FeatureBannerTitle>
              <FeatureBannerDescription>Write, deploy and call your first Solana program</FeatureBannerDescription>
              <FeatureBannerMeta>10 min · 4 steps · Beginner · Anchor</FeatureBannerMeta>
              <FeatureBannerActions>
                <BrandButton hover="beam">Start</BrandButton>
              </FeatureBannerActions>
            </FeatureBannerContent>
            <FeatureBannerAside>
              <FeatureBannerCode file="src/lib.rs" lines={CODE} source={10} log="Hello, World!" />
            </FeatureBannerAside>
          </FeatureBanner>
          <div className="max-w-[24rem] overflow-hidden rounded-card border border-brand-purple/20 bg-surface-panel">
            <div className="relative border-b border-brand-purple/15">
              <div className="absolute inset-y-0 right-0 left-[calc(1rem+29ch)] font-mono text-[0.6875rem]">
                <FeatureBannerDither field="strip" />
              </div>
              <FeatureBannerCode compact lines={CODE} source={10} log="Hello, World!" done />
            </div>
          </div>
        </More>
      }
    >
      <FeatureBanner art={({ wide }) => <IsoVoxels corner={!wide} />} className="md:col-span-2">
        <FeatureBannerContent>
          <FeatureBannerEyebrow>Start here</FeatureBannerEyebrow>
          <FeatureBannerTitle>Hello Anchor</FeatureBannerTitle>
          <FeatureBannerDescription>Write, deploy and call your first Solana program</FeatureBannerDescription>
          <FeatureBannerMeta>10 min · 4 steps · Beginner · Anchor · by acheron</FeatureBannerMeta>
          <FeatureBannerActions>
            <BrandButton hover="beam">Start</BrandButton>
          </FeatureBannerActions>
        </FeatureBannerContent>
      </FeatureBanner>
      <FeatureBanner art={({ wide }) => <IsoVoxels corner={!wide} />}>
        <FeatureBannerContent>
          <FeatureBannerEyebrow tone="muted">Continue · Step 3 of 4</FeatureBannerEyebrow>
          <FeatureBannerTitle>Hello Anchor</FeatureBannerTitle>
          <FeatureBannerDescription>Next: call hello from a client</FeatureBannerDescription>
          <FeatureBannerProgress value={2} max={4} />
          <FeatureBannerActions>
            <BrandButton hover="beam">Continue</BrandButton>
          </FeatureBannerActions>
        </FeatureBannerContent>
      </FeatureBanner>
      <FeatureBanner art={({ wide }) => <IsoVoxels corner={!wide} />}>
        <FeatureBannerContent>
          <FeatureBannerEyebrow tone="muted" done>
            Completed
          </FeatureBannerEyebrow>
          <FeatureBannerTitle>Hello Anchor</FeatureBannerTitle>
          <FeatureBannerDescription>Your program is on devnet, and its hello came back</FeatureBannerDescription>
          <FeatureBannerActions>
            <BrandButton hover="beam">Start Counter</BrandButton>
            <Button variant="quiet">
              Open again
              <ArrowRight data-icon="inline-end" strokeWidth={1.75} className="size-3.5" />
            </Button>
          </FeatureBannerActions>
        </FeatureBannerContent>
      </FeatureBanner>
    </Block>
  )
}

export { FeatureBannerBlock }
