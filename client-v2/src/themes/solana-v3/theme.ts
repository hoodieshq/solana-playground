import type { ThemeParam } from "../../utils";

// Built from two things in the Playground Figma (TsxR005AkQUotiFangKiAj): the
// core colours on the brand board, and the products pinned beside them. The
// layout frame in that file is a sketch — it runs three accents at once, mixes
// Apple's greys with Tailwind's and VS Code's, and sets 40px panels beside 10px
// controls — so it is read here as intent rather than copied as spec.
//
// What the references have in common, and what this theme is trying to earn:
// one accent used only for what is current, hairlines instead of borders drawn
// around floating cards, and an interface set in a UI font with monospace kept
// for code alone. Sans chrome is the single biggest change; the app used to
// hand the code font to every label, tab and tree row.

// Core colours, read off the board in the Figma (section "Brand Landing
// Inspo"): an ice blue, black, a periwinkle, and a deep indigo. That is the
// palette — not the system blue an earlier pass reached for, which was a
// reasonable colour belonging to somebody else's product.
//
// On a black ground the ramp reads in this order: indigo is a fill you can put
// weight on, periwinkle is the mark that says "this one", ice is what you read.
const ICE = "#DEEAFB",
  PERIWINKLE = "#A5B4FC",
  INDIGO = "#1E1B8C",
  INDIGO_LIFT = "#2A26B0";

// Surfaces: black, then three lifts. No hue shift between them — the blue in
// this interface should come from the accent and the type, never from a
// tinted panel, which is what makes a dark UI look muddy.
const BG_BASE = "#000000", // the page and the rail
  BG_SURFACE = "#0A0A0D", // editor, panels, the main work surface
  BG_RAISED = "#121217", // inputs, menus, cards sitting on a panel
  BG_HOVER = "#1A1A21",
  // The accent, and the one thing it is for: whatever is current.
  ACCENT = PERIWINKLE,
  ACCENT_HOVER = "#BCC6FD",
  ACCENT_FILL = INDIGO, // a weighted fill: the primary button, a selected row
  ACCENT_FILL_HOVER = INDIGO_LIFT,
  // Text: neutral. An earlier pass tinted the whole ramp toward the brand's
  // ice blue, and a tint carried across every label in the product stops being
  // a brand and becomes a colour cast. The blue earns its place by being rare:
  // the mark, the current row, the caret. Everything you read is grey.
  TEXT_PRIMARY = "#ECECEE",
  TEXT_SECONDARY = "#9494A0",
  COMMENT = "#6B6B76",
  // Hairlines. In the references — v0, Base44, Linear — panels are divided by
  // a single low-contrast line, not by a border drawn around a floating card.
  BORDER = "#FFFFFF12",
  BORDER_STRONG = "#FFFFFF20",
  DISABLED_BG = "#0E0E12",
  // Kept for the states that genuinely mean something, and used nowhere else.
  GREEN = "#4ADE80",
  RED = "#FF6B6B",
  YELLOW = "#FFD43B",
  CYAN = "#8BD5FF",
  PINK = "#F49AC2",
  PURPLE = "#C4B5FD";

/** Panels. Closer to the references than the sketch: a card, not a pebble. */
const PANEL_RADIUS = "12px";
/** Controls: buttons, inputs, nav rows, anything you click. */
const CONTROL_RADIUS = "8px";

/**
 * The interface font. Everything you read that is not code is set in this —
 * the tree, the tabs, the status bar, the terminal's own chrome. The app used
 * to hand the monospace to all of it, which is the single thing that made it
 * read as a terminal emulator rather than a product.
 */
const DISPLAY_FONT = `"Inter", -apple-system, BlinkMacSystemFont,
  "Segoe UI", Helvetica, Arial, sans-serif`;

const SOLANA_V3: ThemeParam = {
  colors: {
    default: {
      bgPrimary: BG_BASE,
      bgSecondary: BG_SURFACE,
      primary: ACCENT,
      secondary: GREEN,
      textPrimary: TEXT_PRIMARY,
      textSecondary: TEXT_SECONDARY,
      border: BORDER,
    },
    state: {
      disabled: { bg: DISABLED_BG, color: COMMENT },
      error: { color: RED },
      hover: { bg: BG_HOVER, color: TEXT_PRIMARY },
      info: { color: CYAN },
      success: { color: GREEN },
      warning: { color: YELLOW },
    },
  },

  font: {
    other: {
      family: DISPLAY_FONT,
      size: {
        xsmall: "0.8125rem",
        small: "0.875rem",
        medium: "1rem",
        large: "1.375rem",
        xlarge: "1.75rem",
      },
    },
  },

  default: {
    backdrop: { backdropFilter: "blur(12px)" },
    borderRadius: PANEL_RADIUS,
    // A single soft shadow, not the sketch's 24px/48px drop: at this radius a
    // heavy shadow reads as a sticker sitting on the page.
    boxShadow: "rgba(0, 0, 0, 0.45) 0px 8px 28px",
  },

  components: {
    button: {
      default: {
        borderRadius: CONTROL_RADIUS,
        fontFamily: DISPLAY_FONT,
      },
      overrides: {
        primary: {
          bg: ACCENT_FILL,
          color: "#FFFFFF",
          hover: { bg: ACCENT_FILL_HOVER },
        },
        outline: {
          border: `1px solid ${BORDER_STRONG}`,
          hover: { bg: BG_HOVER, borderColor: BORDER_STRONG },
        },
      },
    },
    editor: {
      default: {
        bg: "transparent",
        // The current line is a lift, not a rule drawn under the text
        activeLine: { bg: "#FFFFFF08", borderColor: "transparent" },
        cursorColor: ACCENT,
        selection: { bg: "#A5B4FC2E" },
        searchMatch: { bg: "#A5B4FC24" },
      },
      gutter: {
        bg: "transparent",
        color: COMMENT,
        activeColor: TEXT_SECONDARY,
      },
      wrapper: { bg: BG_SURFACE },
      peekView: {
        title: { bg: BG_BASE },
        editor: { bg: BG_BASE },
      },
      tooltip: { bg: BG_RAISED },
    },
    input: {
      bg: BG_RAISED,
      borderColor: BORDER,
      borderRadius: CONTROL_RADIUS,
      padding: "0.4375rem 0.75rem",
      focus: { outline: `1px solid ${ACCENT}` },
    },
    menu: {
      default: {
        bg: BG_RAISED,
        border: `1px solid ${BORDER}`,
        borderRadius: "14px",
      },
    },
    modal: {
      default: {
        bg: BG_SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: PANEL_RADIUS,
        boxShadow: "rgba(0, 0, 0, 0.55) 0px 16px 48px",
      },
      backdrop: { bg: "rgba(0, 0, 0, 0.5)" },
    },
    progressbar: {
      indicator: { bg: ACCENT },
    },
    skeleton: {
      bg: BG_RAISED,
      highlightColor: BG_HOVER,
    },
    tabs: {
      default: {
        bg: BG_BASE,
        borderBottom: `1px solid ${BORDER}`,
      },
      tab: {
        default: {
          paddingLeft: "0.75rem",
          color: TEXT_SECONDARY,
          borderRightColor: "transparent",
          hover: { bg: BG_HOVER },
        },
        current: {
          bg: BG_SURFACE,
          color: TEXT_PRIMARY,
          borderTopColor: ACCENT,
        },
      },
    },
    terminal: {
      default: { bg: BG_BASE },
    },
    toast: {
      default: {
        bg: BG_RAISED,
        border: `1px solid ${BORDER}`,
        borderRadius: "14px",
      },
      progress: { bg: ACCENT },
    },
    topbar: {
      bg: BG_BASE,
      boxShadow: "none",
      borderBottom: `1px solid ${BORDER}`,
      fontFamily: DISPLAY_FONT,
    },
    tooltip: {
      bg: BG_RAISED,
      bgSecondary: BG_BASE,
    },
    wallet: {
      default: {
        bg: BG_RAISED,
        border: `1px solid ${BORDER}`,
        borderRadius: PANEL_RADIUS,
      },
      main: {
        transactions: {
          table: {
            default: { bg: BG_SURFACE },
            header: { bg: BG_BASE },
          },
        },
      },
    },
  },

  views: {
    bottom: {
      bg: BG_BASE,
      color: TEXT_SECONDARY,
      borderTop: "none",
    },
    main: {
      default: {
        bg: BG_BASE,
        padding: "0.5rem",
        gap: "0.5rem",
      },
      primary: {
        default: {
          bg: BG_SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: PANEL_RADIUS,
          overflow: "hidden",
        },
        home: {
          default: { bg: BG_SURFACE, fontFamily: DISPLAY_FONT },
          title: {
            fontFamily: DISPLAY_FONT,
            fontSize: "2.25rem",
            fontWeight: 600,
            // Large display type needs to be pulled in; at 36px the default
            // tracking reads loose and slightly amateur.
            letterSpacing: "-0.02em",
          },
          resources: {
            card: {
              default: {
                bg: BG_RAISED,
                border: `1px solid ${BORDER}`,
                borderRadius: "16px",
              },
            },
          },
          tutorials: {
            card: {
              bg: BG_RAISED,
              border: `1px solid ${BORDER}`,
              borderRadius: "16px",
            },
          },
        },
      },
      secondary: {
        default: {
          bg: BG_BASE,
          border: `1px solid ${BORDER}`,
          borderTop: `1px solid ${BORDER}`,
          borderRadius: PANEL_RADIUS,
          overflow: "hidden",
        },
      },
    },
    sidebar: {
      default: {
        bg: BG_BASE,
        gap: "0.5rem",
        padding: "0.5rem 0",
      },
      left: {
        default: {
          bg: BG_BASE,
          borderRight: "none",
          width: "3.5rem",
        },
        button: {
          default: {
            width: "2.5rem",
            height: "2.5rem",
            margin: "0.25rem 0",
            borderRadius: CONTROL_RADIUS,
            hover: { bg: BG_HOVER },
          },
          selected: {
            bg: BG_RAISED,
            // Every side set explicitly: the defaults machinery appends
            // borderLeft/borderRight after these, so the shorthand alone
            // would lose to the legacy 2px edge marker.
            border: `1px solid ${BORDER_STRONG}`,
            borderLeft: `1px solid ${BORDER_STRONG}`,
            borderRight: `1px solid ${BORDER_STRONG}`,
          },
        },
      },
      right: {
        default: {
          bg: BG_SURFACE,
          otherBg: BG_SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: PANEL_RADIUS,
          overflow: "hidden",
          height: "calc(100vh - 1.5rem - 1rem)",
        },
        title: {
          height: "2.5rem",
          fontFamily: DISPLAY_FONT,
          fontSize: "1rem",
          fontWeight: 500,
          letterSpacing: "0.04em",
          justifyContent: "flex-start",
          paddingLeft: "1rem",
        },
      },
    },
  },

  // Syntax: the sketch's editor is VS Code Dark+ verbatim, which is six hues
  // competing with each other. This keeps the same six roles but pulls them
  // into the Apple set, so the code sits in the same window as the chrome.
  highlight: {
    typeName: { color: CYAN, fontStyle: "italic" },
    variableName: { color: TEXT_PRIMARY },
    constant: { color: TEXT_PRIMARY },
    namespace: { color: CYAN },
    macroName: { color: GREEN },
    functionCall: { color: GREEN },
    functionDef: { color: GREEN },
    functionArg: { color: TEXT_PRIMARY },
    definitionKeyword: { color: PINK },
    moduleKeyword: { color: PINK },
    modifier: { color: PINK },
    controlKeyword: { color: PINK },
    operatorKeyword: { color: PINK },
    keyword: { color: PINK },
    self: { color: PINK },
    bool: { color: PURPLE },
    integer: { color: PURPLE },
    literal: { color: PURPLE },
    string: { color: YELLOW },
    character: { color: YELLOW },
    operator: { color: PINK },
    derefOperator: { color: PINK },
    specialVariable: { color: PURPLE },
    lineComment: { color: COMMENT },
    blockComment: { color: COMMENT },
    meta: { color: PURPLE },
    regexp: { color: YELLOW },
  },
};

export default SOLANA_V3;
