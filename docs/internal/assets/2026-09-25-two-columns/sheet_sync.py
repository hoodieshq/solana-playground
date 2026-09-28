#!/usr/bin/env python3
"""Sync Linear status into the customer roadmap spreadsheet.

Adds exactly two columns after the last one the sheet already uses -
`Status` and `Linear` - and a set of conditional-format rules that tint
them by status. Nothing else in the sheet is touched: no rows, no
reordering, no scope, no edits to the ten original columns.

Rerunnable. Every run rewrites the two columns from `rowmap.py` and
replaces the rules it created on the previous run.

Credentials, in the order tried:
  1. $PLAYGROUND_SHEET_SA - path to a service-account JSON key.
  2. ~/.config/playground-sheet-sync/service-account.json
  3. Application Default Credentials.
The account needs Editor on the spreadsheet.

Usage:
  python3 sheet_sync.py --dry-run     # print the two columns, touch nothing
  python3 sheet_sync.py               # write them
"""

import argparse
import os
import sys

from rowmap import ROWMAP

SPREADSHEET_ID = "1vdwNW_AqWn9TnuYgkzC9loeJ6uVINF1p3xqxO6zOjqU"
SHEET_TITLE = "Sheet1"
ISSUE_URL = "https://linear.app/solana-fndn/issue/"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

DATA_ROWS = 119  # the sheet's rows below the header; asserted against the API

# A row with no Linear issue reads "Not started". That is defensible
# because every Hoodies issue created since 2026-09-01 was swept and no
# Playground work sits outside the project - but it is an inference, and
# it is the one status in here that nobody reported to us.
SHEET_STATUS = {
    "Not filed": "Not started",
    "In review": "In Review",
    "In progress": "In Progress",
}

# The two cells that state uncertainty rather than a status. Row 7 is the
# Postgres instance; row 36 is the ai SDK transport migration, which the
# customer was told is in progress while our own gate has no verdict.
OVERRIDE = {36: "Needs confirmation"}

# Muted fills on white. "Not started" is deliberately absent: the bulk of
# the sheet is unfiled, and tinting 64 rows would drown the signal.
FILLS = {
    "Done": (0.863, 0.914, 0.835),
    "In Review": (0.847, 0.894, 0.933),
    "In Progress": (0.953, 0.906, 0.808),
    "Todo": (0.941, 0.941, 0.925),
    "Backlog": (0.914, 0.906, 0.941),
    "Needs confirmation": (0.949, 0.882, 0.847),
    "Descoped": (0.910, 0.910, 0.910),
}
TEXT = (0.169, 0.192, 0.184)


def a1_column(index_zero_based):
    """0 -> A, 25 -> Z, 26 -> AA."""
    letters = ""
    n = index_zero_based
    while True:
        letters = chr(ord("A") + n % 26) + letters
        n = n // 26 - 1
        if n < 0:
            return letters


def build_columns():
    """The two columns, header first, one entry per sheet row."""
    out = [("Status", "Linear")]
    for row in range(1, DATA_ROWS + 1):
        entry = ROWMAP.get(row)
        if not entry:
            out.append(("", ""))  # section header, blank, blocker or risk
            continue
        linear, status = entry[0], entry[1]
        status = OVERRIDE.get(row, SHEET_STATUS.get(status, status))
        ids = [t for t in linear.split(",") if t]
        if not ids:
            cell = ""
        else:
            # The cell shows the ticket number only; the URL lives in the
            # formula. Where a row needs several tickets the label lists
            # them all and the link opens the first.
            cell = '=HYPERLINK("%s%s", "%s")' % (
                ISSUE_URL, ids[0], ", ".join(ids)
            )
        out.append((status, cell))
    return out


def credentials():
    from google.oauth2 import service_account
    import google.auth

    explicit = os.environ.get("PLAYGROUND_SHEET_SA")
    default = os.path.expanduser(
        "~/.config/playground-sheet-sync/service-account.json"
    )
    for path in (explicit, default):
        if path and os.path.exists(path):
            print("auth: service account %s" % path)
            return service_account.Credentials.from_service_account_file(
                path, scopes=SCOPES
            )
    creds, _ = google.auth.default(scopes=SCOPES)
    print("auth: application default credentials")
    return creds


def sheet_state(api):
    """Sheet id, its grid size, and the format of the header row."""
    meta = api.spreadsheets().get(
        spreadsheetId=SPREADSHEET_ID,
        ranges=["%s!1:1" % SHEET_TITLE],
        includeGridData=True,
        fields=(
            "sheets(properties(sheetId,title,gridProperties),"
            "data(rowData(values(userEnteredFormat,formattedValue))))"
        ),
    ).execute()
    sheet = meta["sheets"][0]
    props = sheet["properties"]
    grid = props["gridProperties"]
    header_format, header = {}, []
    try:
        header = sheet["data"][0]["rowData"][0]["values"]
    except (KeyError, IndexError):
        pass
    if header:
        header_format = header[0].get("userEnteredFormat", {})
    titles = [
        cell.get("formattedValue", "") for cell in header
    ]
    return props["sheetId"], grid, header_format, titles


def format_requests(sheet_id, first_col, header_format):
    """Header styling, column widths, and one rule per status."""
    last_col = first_col + 2
    whole = {
        "sheetId": sheet_id,
        "startRowIndex": 0,
        "endRowIndex": DATA_ROWS + 1,
        "startColumnIndex": first_col,
        "endColumnIndex": last_col,
    }
    body = dict(whole, startRowIndex=1)

    requests = []
    if header_format:
        requests.append({
            "repeatCell": {
                "range": dict(whole, endRowIndex=1),
                "cell": {"userEnteredFormat": header_format},
                "fields": "userEnteredFormat",
            }
        })
    for offset, width in ((0, 150), (1, 130)):
        requests.append({
            "updateDimensionProperties": {
                "range": {
                    "sheetId": sheet_id,
                    "dimension": "COLUMNS",
                    "startIndex": first_col + offset,
                    "endIndex": first_col + offset + 1,
                },
                "properties": {"pixelSize": width},
                "fields": "pixelSize",
            }
        })

    status_col = a1_column(first_col)
    for index, (status, fill) in enumerate(FILLS.items()):
        requests.append({
            "addConditionalFormatRule": {
                "index": index,
                "rule": {
                    "ranges": [body],
                    "booleanRule": {
                        "condition": {
                            "type": "CUSTOM_FORMULA",
                            "values": [{
                                "userEnteredValue": '=$%s2="%s"' % (
                                    status_col, status
                                )
                            }],
                        },
                        "format": {
                            "backgroundColor": dict(
                                zip(("red", "green", "blue"), fill)
                            ),
                            "textFormat": {
                                "foregroundColor": dict(
                                    zip(("red", "green", "blue"), TEXT)
                                )
                            },
                        },
                    },
                },
            }
        })
    return requests


def drop_our_rules(api, sheet_id, first_col):
    """Remove the rules a previous run of this script left behind."""
    meta = api.spreadsheets().get(
        spreadsheetId=SPREADSHEET_ID,
        fields="sheets(properties(sheetId),conditionalFormats(ranges))",
    ).execute()
    for sheet in meta.get("sheets", []):
        if sheet["properties"]["sheetId"] != sheet_id:
            continue
        rules = sheet.get("conditionalFormats", [])
        doomed = [
            i for i, rule in enumerate(rules)
            if any(
                r.get("startColumnIndex") == first_col
                and r.get("endColumnIndex") == first_col + 2
                for r in rule.get("ranges", [])
            )
        ]
        # Delete from the end: every removal renumbers what follows.
        return [
            {"deleteConditionalFormatRule": {"sheetId": sheet_id, "index": i}}
            for i in sorted(doomed, reverse=True)
        ]
    return []


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    columns = build_columns()
    assert len(columns) == DATA_ROWS + 1, len(columns)

    if args.dry_run:
        for i, (status, link) in enumerate(columns):
            print("%3d  %-20s %s" % (i, status, link))
        return

    from googleapiclient.discovery import build

    api = build("sheets", "v4", credentials=credentials())
    sheet_id, grid, header_format, titles = sheet_state(api)

    rows = grid["rowCount"]
    if rows < DATA_ROWS + 1:
        sys.exit("sheet has %d rows, expected at least %d" % (
            rows, DATA_ROWS + 1
        ))
    # A rerun writes over the columns the last run made. Only a first run
    # widens the sheet, so repeated syncs cannot crawl rightwards.
    if "Status" in titles and titles.index("Status") + 1 < len(titles) \
            and titles[titles.index("Status") + 1] == "Linear":
        first_col = titles.index("Status")
        append = 0
        print("reusing columns %s and %s" % (
            a1_column(first_col), a1_column(first_col + 1)
        ))
    else:
        first_col = grid["columnCount"]
        append = 2
    span = "%s!%s1:%s%d" % (
        SHEET_TITLE, a1_column(first_col), a1_column(first_col + 1),
        DATA_ROWS + 1,
    )

    if append:
        api.spreadsheets().batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={"requests": [{
                "appendDimension": {
                    "sheetId": sheet_id,
                    "dimension": "COLUMNS",
                    "length": append,
                }
            }]},
        ).execute()

    api.spreadsheets().values().update(
        spreadsheetId=SPREADSHEET_ID,
        range=span,
        valueInputOption="USER_ENTERED",
        body={"values": [list(pair) for pair in columns]},
    ).execute()

    requests = drop_our_rules(api, sheet_id, first_col)
    requests += format_requests(sheet_id, first_col, header_format)
    api.spreadsheets().batchUpdate(
        spreadsheetId=SPREADSHEET_ID, body={"requests": requests}
    ).execute()

    print("wrote %s" % span)
    filled = sum(1 for status, _ in columns[1:] if status)
    linked = sum(1 for _, link in columns[1:] if link)
    print("%d rows with a status, %d with a Linear link" % (filled, linked))


if __name__ == "__main__":
    main()
