import type { BrandIconName } from "../../../components/BrandIcon";

export interface FinishBadge {
  name: string;
  icon: BrandIconName;
  earned: boolean;
  /** What earned it, under the name once it is earned */
  why: string;
  /** What is still missing, while it is locked */
  locked: string;
}

/**
 * The tutorial's badges, as the design system's Achievement draws them: a
 * disc in the brand's ring once earned, grey until then. The art is a stand
 * in from the nav's brand icons until the badge family is drawn (DES-135).
 */
export const badgesFor = ({
  allProved,
  deployed,
}: {
  allProved: boolean;
  deployed: boolean;
}): FinishBadge[] => [
  {
    name: "Hello Anchor",
    icon: "tutorial",
    earned: allProved,
    why: "All four steps proved",
    locked: "Prove the skipped step to earn it",
  },
  {
    name: "First deploy",
    icon: "programs",
    earned: deployed,
    why: "A program of yours on devnet",
    locked: "Deploy a program to earn it",
  },
];
