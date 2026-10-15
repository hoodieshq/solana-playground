import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState } from "react";
import { Outlet, OutletContent, useOutletNode } from "./outlet";

const mounts = vi.fn();
const Counter = () => {
  const [n, setN] = useState(0);
  useEffect(() => mounts(), []);
  return <button onClick={() => setN(n + 1)}>count {n}</button>;
};

const Host = ({ where }: { where: "a" | "b" }) => {
  const node = useOutletNode("flex");
  return (
    <>
      <OutletContent node={node}>
        <Counter />
      </OutletContent>
      <div data-testid="a">{where === "a" && <Outlet node={node} />}</div>
      <div data-testid="b">{where === "b" && <Outlet node={node} />}</div>
    </>
  );
};

it("moves its content between places without remounting it", () => {
  mounts.mockClear();
  const { rerender } = render(<Host where="a" />);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByTestId("a").textContent).toBe("count 1");
  act(() => rerender(<Host where="b" />));
  expect(screen.getByTestId("b").textContent).toBe("count 1");
  expect(screen.getByTestId("a").childNodes).toHaveLength(0);
  expect(mounts).toHaveBeenCalledTimes(1);
});

it("gives the node the class it was made with", () => {
  render(<Host where="a" />);
  const node = screen.getByTestId("a").firstElementChild?.firstElementChild;
  expect(node?.classList.contains("flex")).toBe(true);
});
