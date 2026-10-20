import { NewProject } from "@/widgets/catalog";
import type { CatalogPage } from "@/widgets/catalog";
import { ModalFrame } from "@/widgets/overlays";

/** The gallery's two lists, one choice each */
export type GalleryTab = CatalogPage;

/**
 * The "What do you want to build?" dialog: the entry point for a new
 * project. The content is `widgets/catalog`'s `NewProject`; this wrapper
 * stays here because a widget may not import `widgets/overlays`, and it is
 * what `PgView.setModal` opens, which fires `PgView.onDidOpenModal` (the
 * left Sheet closes on it).
 */
const NewWorkspaceModal = ({
  initialTab = "tutorials",
}: {
  initialTab?: GalleryTab;
}) => (
  <ModalFrame
    name="new-workspace"
    title="What do you want to build?"
    size="wide"
  >
    <NewProject initialTab={initialTab} />
  </ModalFrame>
);

export default NewWorkspaceModal;
