import type { ThemeParam } from "../../utils";

// Built from the Playground Figma (file TsxR005AkQUotiFangKiAj, frame 2:4),
// with four things deliberately changed rather than copied. The brief asked for
// a clean Claude/Codex take with a little Apple in it, and the file is a
// sketch, not a spec.
//
// 1. One accent, not three. The sketch runs a blue chat (#2563EB), a cyan
//    editor caret (#38BDF8) and a green progress rail (#10B981) at once, so
//    nothing reads as *the* accent. Here blue carries every current state and
//    green is demoted to what it should mean: success, and nothing else.
// 2. One family of greys. The sketch mixes Apple's (#8E8E93), Tailwind's
//    (#9CA3AF, #6B7280) and VS Code's (#858585, #CCC). Three greys in one
//    window is a thing you feel before you can name it. These are one ramp.
// 3. Calmer corners. 40px panels beside 10px controls is a wide gap to hold in
//    one glance, and 40 does not sit on the 8px rhythm the rest of the layout
//    keeps. Panels come down to 20, controls stay at 10, pills stay round.
// 4. Surfaces lift, they do not recolour. The sketch's editor chrome is
//    Tailwind slate (#0F172A, #1E293B) — blue-tinted — against a neutral black
//    page. Every surface here is the same hue, one step lighter each time.

// Surfaces: one neutral ramp, each step a lift rather than a new colour.
const BG_BASE = "#08080A", // the page, the rail, the status bar
  BG_SURFACE = "#101013", // editor, panels, the cards that float on the page
  BG_RAISED = "#17171B", // inputs, menus, cards inside a panel
  BG_HOVER = "#202026",
  // The one accent. Apple's dark-mode system blue: it holds up on near-black
  // where the sketch's #2563EB goes muddy, and it is the only colour allowed
  // to mean "this is the current thing".
  ACCENT = "#0A84FF",
  ACCENT_HOVER = "#3E9CFF",
  // The rest of Apple's dark-mode system set, used only for what they mean.
  GREEN = "#30D158",
  RED = "#FF453A",
  YELLOW = "#FFD60A",
  CYAN = "#64D2FF",
  PINK = "#FF6482",
  PURPLE = "#BF5AF2",
  // Text: one ramp, no second grey family.
  TEXT_PRIMARY = "#F2F2F5",
  TEXT_SECONDARY = "#96969E",
  COMMENT = "#6A6A73",
  // Borders as light at low alpha, so they lift with the surface under them
  // instead of drawing a hard line across it.
  BORDER = "#FFFFFF14",
  BORDER_STRONG = "#FFFFFF26",
  DISABLED_BG = "#0F0F12";

/** Panels: editor, terminal, the side panel, the cards on Home. */
const PANEL_RADIUS = "20px";
/** Controls: buttons, inputs, nav rows, anything you click. */
const CONTROL_RADIUS = "10px";

/**
 * Chrome font. The sketch asks for Inter and Inter is right for this: it is
 * the quietest of the grotesques and gets out of the way of the code. Loaded
 * in index.css; code keeps the monospace the user picked.
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
          bg: ACCENT,
          color: "#FFFFFF",
          hover: { bg: ACCENT_HOVER },
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
        selection: { bg: "#0A84FF33" },
        searchMatch: { bg: "#0A84FF26" },
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
