# The two columns as an HTML table. Pasted into the sheet it carries the
# values, the ticket links and the fills in one operation - no formulas,
# so the spreadsheet's locale cannot break the argument separator.
from rowmap import ROWMAP

ISSUE = "https://linear.app/solana-fndn/issue/"
ROWS = 119
SHEET_STATUS = {"Not filed": "Not started", "In review": "In Review",
                "In progress": "In Progress"}
OVERRIDE = {36: "Needs confirmation"}
FILL = {
    "Done": "#dce9d5",
    "In Review": "#d8e4ee",
    "In Progress": "#f3e7ce",
    "Todo": "#f0f0ec",
    "Backlog": "#e9e7f0",
    "Needs confirmation": "#f2e1d8",
    "Descoped": "#e8e8e8",
}
BASE = ""

def cells():
    yield ("Status", "Linear", "", True)
    for r in range(1, ROWS + 1):
        e = ROWMAP.get(r)
        if not e:
            yield ("", "", "", False)
            continue
        status = OVERRIDE.get(r, SHEET_STATUS.get(e[1], e[1]))
        ids = [t for t in e[0].split(",") if t]
        link = ('<a href="%s%s">%s</a>' % (ISSUE, ids[0], ", ".join(ids))
                if ids else "")
        yield (status, link, FILL.get(status, ""), False)

out = ['<meta charset="utf-8"><table>']
for status, link, fill, head in cells():
    style = ("background-color:%s" % fill) if fill else ""
    if head:
        style = (style + ";" if style else "") + "font-weight:bold"
    td = ('<td style="%s">%s</td>' % (style, status)) if style else (
        "<td>%s</td>" % status)
    out.append("<tr>%s<td>%s</td></tr>" % (td, link))
out.append("</table>")
open("paste.html", "w").write("".join(out))
print("bytes:", len("".join(out)))
