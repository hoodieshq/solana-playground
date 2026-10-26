export type Row = { kind: "context" | "added" | "removed"; text: string }

/** Line diff by longest common subsequence. Files here are under 30 lines */
export function diffLines(before: string, after: string): Row[] {
  const a = before.split("\n")
  const b = after.split("\n")
  const L: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])

  const rows: Row[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ kind: "context", text: a[i] })
      i++
      j++
    } else if (L[i + 1][j] >= L[i][j + 1]) {
      rows.push({ kind: "removed", text: a[i++] })
    } else {
      rows.push({ kind: "added", text: b[j++] })
    }
  }
  while (i < a.length) rows.push({ kind: "removed", text: a[i++] })
  while (j < b.length) rows.push({ kind: "added", text: b[j++] })
  return rows
}

/** Keeps changed rows and up to `keep` unchanged rows around them */
export function trimContext(rows: Row[], keep = 2): Row[] {
  return rows.filter((_, k) =>
    rows.slice(Math.max(0, k - keep), k + keep + 1).some((r) => r.kind !== "context")
  )
}

export function countRows(rows: Row[]) {
  return {
    added: rows.filter((r) => r.kind === "added").length,
    removed: rows.filter((r) => r.kind === "removed").length,
  }
}
