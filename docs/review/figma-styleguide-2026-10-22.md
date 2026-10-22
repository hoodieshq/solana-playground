# Styleguide from Nikita's Figma: what to check in the product

Taken on 22.10.2026 from a copy of the Playground file (5Xhir5rHGj8GuhrzSdEPzQ), page
Styleguide 84:3, section "Styleguide v1, Sep 29, 2026", and the WiP 84:4 screens.
The Archive page isn't covered. The Figma MCP on this account is rate limited,
so below is what was read off the boards and screens.

## Product color (dark theme)

Base #101011, Sidebar #161617, Surface #1C1C1E, Raised #242426 (current
line), Hover #2A2A2C, Border #26262A (single line), Border strong #33333A.
Text #F2F2F3, secondary #A0A0A6, comment #6B6B72. Accent #9945FF, accent
fill #8A3FF5 under white text. Success #14F195, Error #EF4444, Warning
#F59E0B, Info #38BDF8.

Purple only for what's current and what's active. The brand gradient in the
product is only a 1 px ring (send, Build, Start, I'm stuck, current
stage, selected framework), it fills on hover and press. No fill at
rest and no gradient text.

## Fonts

Stack Sans Headline for things read from a distance (page titles).
Stack Sans Text for the interface: phone title 17/440, body 16/320, control
15/440, label 13/380; desktop rows 13 px, reading 15 px, weights 350 to 500.
JetBrains Mono only in the editor and terminal.

## Sizes

Radii: 8 controls, 12 panels and cards, 16 composer and cards on
the phone, 999 pills. Desktop: floating panels with an 8 px gap, header
44, second row 38, bottom bar 28, sidebar collapses into a rail. Phone
up to 720 px: bar 60, panel header 52, rows 52, tap targets at least 48,
main actions at the bottom, menus as sheets or pages.

## Logo

The mark builds a play shape out of the Solana symbol and puts a ring next to it (▷O). White on
ink, on gradient backgrounds and on purple; ink on light. Never
filled with the gradient, never outlined, never rotated. The mark is at least
24 px tall, the lockup at least 120 px wide. The sidebar uses the lockup.

## Pattern and backgrounds

60 px grid, 2 px lines, rounded joints, white at 10% on colored backgrounds; on
ink it rises from the bottom and fades toward the top. Backgrounds Haze #B8A6F5, Deep #6858D2,
Explore #6A63CD, Violet #6A4BCF, seven color fields. Brand tiles: background without
the pattern, the full white mark at about half the height.

## Motion

Press 200 ms cubic-bezier(0.22,0.61,0.36,1) for hover and button fill.
Rise 620 ms cubic-bezier(0.22,0.61,0.24,1) for small entrances. Ground 1400
ms cubic-bezier(0.45,0,0.2,1). With reduced motion nothing moves.

## Screens that should exist (WiP)

Sidebar: lockup, Home, New project, Tutorials, Programs, Projects, checklist
"Get set up · n of 4" (Connect the assistant, Choose a network, Sign in with
GitHub, Connect a wallet), Devnet with a dot, Sign in. Home: "Where should we
begin?", composer (+, Opus 5.5, High, send), three cards, "Or learn from
one of these" and All 16. Tutorial page: author as a link, Level,
Framework, Languages, What you will learn, Start. Lesson on the phone: a
"1/4" band with the check rule, step arrows, Read the page, I'm stuck. Code on
the phone: Chat | Code, file in the header, a file tree with all files and New
file. Chat: empty state with three suggestions, context chips, "Nothing is
written to your project without your click", model picker sheet (Opus 5.5,
Sonnet 5, Gemini 3.6 Flash, More models, Connect with a key). Build: empty
state and the terminal as a strip. Phone menu as a full page.
