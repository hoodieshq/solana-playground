import {
  clearFailures,
  getFailures,
  getLastFailure,
  isMissing,
  report,
} from "./diagnostics";

beforeEach(() => {
  clearFailures();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

it("records a failure and hands back the newest one", () => {
  const error = new Error("disk full");
  report("write thread", error);

  expect(getLastFailure()).toMatchObject({ what: "write thread", error });
  expect(getFailures()).toHaveLength(1);
  expect(console.error).toHaveBeenCalledWith(
    "persistence: write thread failed",
    error
  );
});

it("keeps the list bounded so a failing loop cannot grow it forever", () => {
  for (let i = 0; i < 25; i++) report(`attempt ${i}`, null);

  expect(getFailures()).toHaveLength(20);
  expect(getFailures()[0].what).toBe("attempt 5");
});

it("tells a missing file apart from a real fault", () => {
  expect(isMissing({ code: "ENOENT" })).toBe(true);
  expect(isMissing(new Error("ENOENT: no such file"))).toBe(true);
  expect(isMissing(new Error("quota exceeded"))).toBe(false);
  expect(isMissing(undefined)).toBe(false);
});
