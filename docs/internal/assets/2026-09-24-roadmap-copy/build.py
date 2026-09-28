import csv, sys, datetime
sys.path.insert(0, sys.argv[1])
from tickets import TICKETS
from rowmap import ROWMAP
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

SP = sys.argv[1]
GEN = "2026-09-24"
SRC = "https://docs.google.com/spreadsheets/d/1vdwNW_AqWn9TnuYgkzC9loeJ6uVINF1p3xqxO6zOjqU"

rows = list(csv.reader(open(SP + "/roadmap.csv")))
head, data = rows[0], rows[1:]

# ---------- palette ----------
PURPLE, GREEN, BLUE, GREY = "9945FF", "14F195", "19B4FF", "9AA0A6"
WAVE_FILL = {1: GREEN, 2: PURPLE, 3: BLUE, 4: GREY}
WAVE_NAME = {0: "Done", 1: "Wave 1  22 Sep - 3 Oct", 2: "Wave 2  6 - 24 Oct",
             3: "Wave 3  27 Oct - 14 Nov", 4: "Wave 4  later / out of September"}
STATUS_FILL = {
    "Done": "D6F5E3", "In review": "D6ECFB", "In progress": "D6ECFB",
    "Todo": "FDF0D5", "Backlog": "EEEEF0", "Not filed": "FBE0E0",
    "Needs confirmation": "FBE9D0", "Descoped": "E4E4E8", "Canceled": "E4E4E8",
}
HDR = PatternFill("solid", fgColor="1C1C24")
SECT = PatternFill("solid", fgColor="E8E2F7")
THIN = Side(style="thin", color="D8D8DE")
BOX = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")
TOP = Alignment(vertical="top")

def style_header(ws, ncols, r=1):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=r, column=c)
        cell.fill, cell.font = HDR, Font(bold=True, color="FFFFFF", size=10)
        cell.alignment = Alignment(wrap_text=True, vertical="center")
    ws.row_dimensions[r].height = 30

wb = Workbook()

# =====================================================================
# 1. Read me
# =====================================================================
ws = wb.active
ws.title = "Read me"
ws.column_dimensions["A"].width = 26
ws.column_dimensions["B"].width = 118
readme = [
 ("SECTION", "Playground September roadmap - working copy"),
 ("Generated", GEN + ". Linear pulled the same day: team Hoodies, project Solana Playground, 47 issues."),
 ("Source sheet", SRC),
 ("What this is", "A copy of the customer-facing scope sheet with our own tracking columns added. "
                  "The source sheet is read-only to us and public to the customer; nothing here is written back to it."),
 ("SECTION", "What was added"),
 ("Linear", "Every issue that covers this row. Empty means the work is not filed."),
 ("Status", "Done | In review | In progress | Todo | Backlog | Not filed | Needs confirmation | Descoped. "
            "Derived from Linear where a ticket exists, otherwise from the named evidence."),
 ("Evidence", "Where the status came from. Nothing in the Status column is unsourced: it is either a Linear "
              "issue and its state, a decision record, or a dated status message. Read this column before trusting a row."),
 ("Wave", "Execution order, not a promise. Wave 1 is in flight or gates the committed history lane. "
          "Wave 2 is the rest of P1. Wave 3 is P2. Wave 4 is P3 plus what D41 moved out of September."),
 ("Blocked by", "The blocker row (BL-n) or risk (R-n) further down the Roadmap tab that gates this item."),
 ("Comment", "What a reader would otherwise get wrong. Mostly where a decision changed what a row means."),
 ("SECTION", "Sections that are not in the customer sheet"),
 ("L", "PR #29 follow-ups and defects. D43 keeps bugs and follow-up work out of the customer sheet; "
        "this copy is the tracker, so they live here."),
 ("M", "Engineering tooling. Never shown in a product roadmap; carried here so no ticket is lost."),
 ("Archive", "On the Linear tab: work closed before the September scope document existed."),
 ("SECTION", "Read these before re-deciding anything"),
 ("D40", "The wallet connector is ConnectorKit, and mainnet deploys stay. HOO-1615/1616/1617 are the same work "
         "under the old name and must be retitled, not duplicated."),
 ("D41", "Kora leaves the September cut, and mainnet Kora may not be wanted at all. Stop chasing the Jupiter key."),
 ("D43", "The customer sheet is a scope document, not a tracker. Rows flow sheet to Linear, never back."),
 ("D44", "History is kept whole on the server, capped at 200 messages locally, and cleared by hand. Nothing expires."),
 ("D45", "A conversation is not bound to the agent that produced it."),
 ("SECTION", "Three things this sheet cannot settle"),
 ("ai SDK", "Row 35 of section C. The customer has been told the migration is in progress; the sheet gates it on a "
            "spike verdict that nothing records, and D1 rejected the Vercel AI SDK. Settle before the next status."),
 ("Reasoning", "Row 15 of section A2. Whether the model's reasoning is stored was asked by Sergey and never answered "
               "by Cat. It is built as no-reasoning by our assumption, not by agreement."),
 ("Programs in the DB", "Row 48 of section D. Cat wants the database to hold programs and conversations; D31 sends "
                        "projects to the learner's own GitHub. One of the two has to give, and it is the customer's call."),
]
r = 1
for k, v in readme:
    if k == "SECTION":
        ws.cell(row=r, column=1, value=v).font = Font(bold=True, size=12, color="4A2BAF")
        ws.cell(row=r, column=1).fill = SECT
        ws.cell(row=r, column=2).fill = SECT
        ws.row_dimensions[r].height = 22
    else:
        ws.cell(row=r, column=1, value=k).font = Font(bold=True, size=10)
        c = ws.cell(row=r, column=2, value=v)
        c.alignment = WRAP
        ws.row_dimensions[r].height = max(15, 13 * (1 + len(v) // 110))
    r += 1

# =====================================================================
# 2. Roadmap
# =====================================================================
ws = wb.create_sheet("Roadmap")
NEW = ["Linear", "Status", "Assignee", "Wave", "Evidence", "Blocked by", "Comment"]
ws.append(head + NEW)
style_header(ws, len(head) + len(NEW))

tdict = {t[0]: t for t in TICKETS}
ST_NORM = {"In Review": "In review"}

def norm(s):
    return ST_NORM.get(s, s)

PRIO_MAP = {"Urgent": "P1", "High": "P1", "Medium": "P2", "Low": "P3", "No priority": "P3"}

def assignees(ids):
    a = [tdict[i][4] for i in ids if i in tdict and tdict[i][4]]
    return ", ".join(sorted(set(a)))

out_row = 1
for n, row in enumerate(data, 1):
    row = row + [""] * (len(head) - len(row))
    m = ROWMAP.get(n)
    if m:
        lin, status, ev, wave, blk, comment = m
        ids = [x for x in lin.split(",") if x]
        extra = [lin.replace(",", ", "), status, assignees(ids),
                 WAVE_NAME[wave], ev, blk, comment]
    else:
        extra = ["", "", "", "", "", "", ""]
    ws.append(row + extra)
    out_row += 1

# --- L and M sections ---
L_ORDER = ["HOO-1720", "HOO-1721", "HOO-1722", "HOO-1723", "HOO-1724", "HOO-1725",
           "HOO-1726", "HOO-1727", "HOO-1728", "HOO-1729", "HOO-1719", "HOO-1717",
           "HOO-1685", "HOO-1686", "HOO-1687", "HOO-1688", "HOO-1707", "HOO-1709"]
M_ORDER = ["HOO-1715", "HOO-634"]

def wave_for(t):
    if t[2] in ("Done", "Canceled"):
        return 0
    return {"Urgent": 1, "High": 1, "Medium": 2, "Low": 3, "No priority": 3}[t[3]]

ws.append([""] * (len(head) + len(NEW)))
ws.append(["L", "section", "L PR #29 follow-ups and defects", "P1", "", "", "", "", "",
           "Not in the customer sheet. D43 keeps bugs and follow-up work out of it; "
           "this copy is the tracker, so they are carried here.",
           "", "", "", "", "", "", ""])
for tid in L_ORDER:
    t = tdict[tid]
    w = wave_for(t)
    ws.append(["", "item", "", PRIO_MAP[t[3]], "", t[1], "", "", "",
               t[8], t[0], norm(t[2]), t[4], WAVE_NAME[w], t[0] + " " + t[2],
               "", t[8]])
ws.append([""] * (len(head) + len(NEW)))
ws.append(["M", "section", "M Engineering tooling", "P2", "", "", "", "", "",
           "Never shown in a product roadmap. Carried here so no ticket is lost.",
           "", "", "", "", "", "", ""])
for tid in M_ORDER:
    t = tdict[tid]
    w = wave_for(t)
    ws.append(["", "item", "", PRIO_MAP[t[3]], "", t[1], "", "", "",
               t[8], t[0], norm(t[2]), t[4], WAVE_NAME[w], t[0] + " " + t[2], "", t[8]])

# --- styling ---
ncols = len(head) + len(NEW)
COL = {name: i + 1 for i, name in enumerate(head + NEW)}
for r in range(2, ws.max_row + 1):
    typ = ws.cell(row=r, column=COL["Type"]).value
    for c in range(1, ncols + 1):
        cell = ws.cell(row=r, column=c)
        cell.border = BOX
        cell.alignment = WRAP
        cell.font = Font(size=10)
    if typ == "section":
        for c in range(1, ncols + 1):
            ws.cell(row=r, column=c).fill = SECT
            ws.cell(row=r, column=c).font = Font(bold=True, size=10)
    elif typ in ("blocker", "risk"):
        for c in range(1, ncols + 1):
            ws.cell(row=r, column=c).fill = PatternFill("solid", fgColor="FFF4E0")
    st = ws.cell(row=r, column=COL["Status"]).value
    if st in STATUS_FILL:
        sc = ws.cell(row=r, column=COL["Status"])
        sc.fill = PatternFill("solid", fgColor=STATUS_FILL[st])
        sc.font = Font(size=10, bold=True)
    wv = ws.cell(row=r, column=COL["Wave"]).value
    if wv:
        for k, v in WAVE_NAME.items():
            if v == wv and k:
                ws.cell(row=r, column=COL["Wave"]).fill = PatternFill("solid", fgColor=WAVE_FILL[k])
    if ws.cell(row=r, column=COL["Blocked by"]).value:
        ws.cell(row=r, column=COL["Blocked by"]).fill = PatternFill("solid", fgColor="FBE0E0")

widths = {"ID": 7, "Type": 9, "Section": 20, "Priority": 8, "User story": 46,
          "Item": 46, "Scope": 8, "Estimated size": 9, "Adjusted size": 9,
          "Notes": 52, "Linear": 26, "Status": 15, "Assignee": 13, "Wave": 17,
          "Evidence": 30, "Blocked by": 10, "Comment": 52}
for name, w in widths.items():
    ws.column_dimensions[get_column_letter(COL[name])].width = w
ws.freeze_panes = "C2"
ws.auto_filter.ref = "A1:" + get_column_letter(ncols) + str(ws.max_row)

# =====================================================================
# 3. Gantt
# =====================================================================
gs = wb.create_sheet("Gantt")
W0 = datetime.date(2026, 9, 22)
weeks = [W0 + datetime.timedelta(days=7 * i) for i in range(8)]
WAVE_SPAN = {1: (0, 1), 2: (2, 4), 3: (5, 7)}

LANES = [("A1", "A1 History backend"), ("A2", "A2 History frontend"),
         ("B", "B History step 2"), ("C", "C AI rail"), ("D", "D GitHub sharing"),
         ("E", "E IDL 1.x and seeds"), ("F", "F Anchor 1.2 and LSP"),
         ("G", "G Deploys"), ("H", "H Lesson validation"), ("I", "I Mobile"),
         ("J", "J Infra"), ("K", "K Design pass"),
         ("L", "L PR #29 follow-ups"), ("M", "M Engineering tooling")]
LANE_ROWS = {  # first and last sheet data-row index of each lane
    "A1": (2, 7), "A2": (9, 18), "B": (20, 24), "C": (26, 41), "D": (43, 48),
    "E": (50, 55), "F": (57, 66), "G": (68, 84), "H": (86, 88), "I": (90, 91),
    "J": (93, 101), "K": (103, 105)}

buckets = {}  # (lane, wave) -> [count, done, blockers]
for lane, (a, b) in LANE_ROWS.items():
    for i in range(a, b + 1):
        lin, status, ev, wave, blk, comment = ROWMAP[i]
        key = (lane, wave)
        c = buckets.setdefault(key, [0, 0, set()])
        c[0] += 1
        if status == "Done":
            c[1] += 1
        if blk:
            c[2].add(blk)
for tid in L_ORDER:
    t = tdict[tid]
    c = buckets.setdefault(("L", wave_for(t)), [0, 0, set()])
    c[0] += 1
    if t[2] in ("Done", "Canceled"):
        c[1] += 1
for tid in M_ORDER:
    t = tdict[tid]
    c = buckets.setdefault(("M", wave_for(t)), [0, 0, set()])
    c[0] += 1
    if t[2] in ("Done", "Canceled"):
        c[1] += 1

gs.append(["Lane", "Wave", "Items", "Done"] +
          ["W%d\n%s" % (i + 1, d.strftime("%d %b")) for i, d in enumerate(weeks)] +
          ["Later", "Blocked by"])
style_header(gs, 4 + 8 + 2)
gs.cell(row=1, column=1).value = "Lane"

gr = 2
for code, label in LANES:
    first = True
    for wave in (0, 1, 2, 3, 4):
        if (code, wave) not in buckets:
            continue
        cnt, done, blks = buckets[(code, wave)]
        gs.cell(row=gr, column=1, value=label if first else "")
        gs.cell(row=gr, column=2, value=WAVE_NAME[wave].split("  ")[0])
        gs.cell(row=gr, column=3, value=cnt)
        gs.cell(row=gr, column=4, value=done)
        if wave in WAVE_SPAN:
            a, b = WAVE_SPAN[wave]
            for i in range(a, b + 1):
                cell = gs.cell(row=gr, column=5 + i)
                cell.fill = PatternFill("solid", fgColor=WAVE_FILL[wave])
        elif wave == 4:
            cell = gs.cell(row=gr, column=13, value="deferred")
            cell.fill = PatternFill("solid", fgColor=WAVE_FILL[4])
            cell.font = Font(size=9, color="FFFFFF")
        elif wave == 0:
            gs.cell(row=gr, column=13, value="shipped")
            gs.cell(row=gr, column=13).fill = PatternFill("solid", fgColor="D6F5E3")
        gs.cell(row=gr, column=14, value=", ".join(sorted(blks)))
        if blks:
            gs.cell(row=gr, column=14).fill = PatternFill("solid", fgColor="FBE0E0")
        for c in range(1, 15):
            gs.cell(row=gr, column=c).border = BOX
        if first:
            gs.cell(row=gr, column=1).font = Font(bold=True, size=10)
        first = False
        gr += 1

gs.append([])
gr += 1
legend = [
    "Waves are an order of execution, not committed dates. The week columns show the order, "
    "nothing in this sheet is a date anybody has agreed to.",
    "Wave 1: in flight, or it gates the history lane the team committed to.  "
    "Wave 2: the rest of P1.  Wave 3: P2.  Wave 4: P3, plus what D41 moved out of September.",
    "A red Blocked by cell means the lane cannot finish until somebody outside the team hands "
    "over access. Those are the BL rows at the bottom of the Roadmap tab.",
    "21 Sep, the date Rev 2 names for Phase 1, has passed and nobody restated it.",
]
for line in legend:
    gs.cell(row=gr, column=1, value=line).alignment = WRAP
    gs.merge_cells(start_row=gr, start_column=1, end_row=gr, end_column=14)
    gs.row_dimensions[gr].height = 28
    gr += 1

gs.column_dimensions["A"].width = 24
gs.column_dimensions["B"].width = 9
gs.column_dimensions["C"].width = 7
gs.column_dimensions["D"].width = 7
for i in range(8):
    gs.column_dimensions[get_column_letter(5 + i)].width = 9
gs.column_dimensions["M"].width = 11
gs.column_dimensions["N"].width = 16
gs.freeze_panes = "E2"

# =====================================================================
# 4. Linear
# =====================================================================
ls = wb.create_sheet("Linear")
ls.append(["Issue", "Title", "Status", "Linear priority", "Assignee", "Parent",
           "Labels", "Sheet section", "Note", "URL"])
style_header(ls, 10)
SECTION_LABEL = {c: l for c, l in LANES}
SECTION_LABEL["ARCHIVE"] = "Archive: closed before the September scope"
order = {"In Review": 0, "Todo": 1, "Backlog": 2, "Done": 3, "Canceled": 4}
for t in sorted(TICKETS, key=lambda t: (t[7] == "ARCHIVE", order.get(t[2], 9), t[0])):
    ls.append([t[0], t[1], t[2], t[3], t[4], t[5], ", ".join(t[6]),
               SECTION_LABEL.get(t[7], t[7]), t[8],
               "https://linear.app/solana-fndn/issue/" + t[0]])
for r in range(2, ls.max_row + 1):
    for c in range(1, 11):
        ls.cell(row=r, column=c).border = BOX
        ls.cell(row=r, column=c).alignment = WRAP
        ls.cell(row=r, column=c).font = Font(size=10)
    st = ls.cell(row=r, column=3).value
    key = {"In Review": "In review"}.get(st, st)
    if key in STATUS_FILL:
        ls.cell(row=r, column=3).fill = PatternFill("solid", fgColor=STATUS_FILL[key])
for col, w in zip("ABCDEFGHIJ", [11, 62, 12, 13, 12, 11, 20, 24, 48, 34]):
    ls.column_dimensions[col].width = w
ls.freeze_panes = "B2"
ls.auto_filter.ref = "A1:J" + str(ls.max_row)

out = SP + "/Playground-roadmap-working-copy.xlsx"
wb.save(out)
print("written:", out)
print("roadmap rows:", ws.max_row, "| gantt rows:", gs.max_row, "| linear rows:", ls.max_row)
