import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

// What `PgView.setModal` opens: the wide dialog, named for telemetry, around
// New project
vi.mock("@/widgets/overlays", () => ({
  ModalFrame: ({
    name,
    title,
    size,
    children,
  }: {
    name: string;
    title: string;
    size: string;
    children: React.ReactNode;
  }) => (
    <section aria-label={title} data-name={name} data-size={size}>
      {children}
    </section>
  ),
}));
vi.mock("@/widgets/catalog", () => ({
  NewProject: ({ initialTab }: { initialTab?: string }) => (
    <p>{`new project on ${initialTab}`}</p>
  ),
}));

import NewWorkspaceModal from "./NewWorkspaceModal";

it("is the wide What do you want to build? dialog around New project", () => {
  render(<NewWorkspaceModal initialTab="programs" />);

  const dialog = screen.getByRole("region", {
    name: "What do you want to build?",
  });
  expect(dialog.dataset.name).toBe("new-workspace");
  expect(dialog.dataset.size).toBe("wide");
  expect(dialog.textContent).toBe("new project on programs");
});
