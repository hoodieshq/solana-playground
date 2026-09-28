# Builds the two columns Slava adds to the original sheet: Status + Linear.
# Aligned 1:1 with the sheet's rows, header included, nothing else touched.
import csv, sys
from rowmap import ROWMAP

BASE = "https://linear.app/salt/issue/"  # replaced below
BASE = "https://linear.app/solana-fndn/issue/"

# A row with no ticket is "Not started": we swept every Hoodies issue created
# since 1 Sep and no Playground work is filed outside the project.
SHEET_STATUS = {
    "Not filed": "Not started",
    "In review": "In Review",
    "In progress": "In Progress",
}

# The only cell we do not state: the customer was told the ai SDK migration is
# in progress, our own gate says the spike never produced a verdict.
OVERRIDE = {36: "Needs confirmation"}

rows = list(csv.reader(open("roadmap-0925.csv")))
header, data = rows[0], rows[1:]
assert len(data) == 119, len(data)

out = [("Status", "Linear")]
for i, row in enumerate(data, start=1):
    entry = ROWMAP.get(i)
    if not entry:
        out.append(("", ""))
        continue
    linear, status = entry[0], entry[1]
    status = OVERRIDE.get(i, SHEET_STATUS.get(status, status))
    ids = [t for t in linear.split(",") if t]
    if not ids:
        cell = ""
    elif len(ids) == 1:
        cell = '=HYPERLINK("%s%s","%s")' % (BASE, ids[0], ids[0])
    else:
        cell = '=HYPERLINK("%s%s","%s")' % (BASE, ids[0], ", ".join(ids))
    out.append((status, cell))

with open("status-columns.tsv", "w") as f:
    for a, b in out:
        f.write("%s\t%s\n" % (a, b))

with open("status-columns-plain.tsv", "w") as f:
    for i, (a, b) in enumerate(out):
        if i == 0:
            f.write("Status\tLinear\n"); continue
        entry = ROWMAP.get(i)
        ids = [t for t in entry[0].split(",") if t] if entry else []
        f.write("%s\t%s\n" % (a, " ".join(BASE + t for t in ids)))

from collections import Counter
print(Counter(a for a, _ in out[1:]).most_common())
print("rows:", len(out), "with a ticket:", sum(1 for _, b in out[1:] if b))
