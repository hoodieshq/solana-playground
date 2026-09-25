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

// A neutral ramp, matched to the reference screenshots rather than to the
// Figma frame's tokens. The frame's greys carry blue in them (#9496A1), and
// against a near-black page that reads as a cast over the whole interface —
// which is the thing that kept being wrong. These are equal-channel greys: no
// hue at all, so the only colour in the window is the one we put there.
const BG_BASE = "#101011", // the page and the central stage
  BG_SIDEBAR = "#161617", // the nav column
  BG_SURFACE = "#1C1C1E", // cards, the prompt box, inputs, menus
  BG_RAISED = "#242426", // a control on a card, the current nav row
  BG_HOVER = "#2A2A2C",
  // Text, three steps: what you read, what supports it, and labels you only
  // need to find once.
  TEXT_PRIMARY = "#F2F2F3",
  TEXT_SECONDARY = "#A0A0A6",
  COMMENT = "#6B6B72",
  // One hairline, everywhere.
  BORDER = "#26262A",
  BORDER_STRONG = "#33333A",
  // The accent is the presentation's: Solana's purple, so the product carries
  // the colour the brand is introduced in. Kept for what is current and what
  // acts — not on body text, not as a tint over anything. The fill is a step
  // deeper so white on it still reads.
  ACCENT = "#9945FF",
  ACCENT_FILL = "#8A3FF5",
  ACCENT_FILL_HOVER = "#9B5BFF",
  DISABLED_BG = "#191919",
  // States, and nothing else uses them. Success is Solana's own green.
  GREEN = "#14F195",
  RED = "#EF4444",
  YELLOW = "#F59E0B",
  CYAN = "#38BDF8",
  PINK = "#EC4899",
  PURPLE = "#8B5CF6";

/** Cards and panels, as the frame draws them. */
const PANEL_RADIUS = "12px";
/** Controls: buttons, inputs, nav rows, anything you click. */
const CONTROL_RADIUS = "8px";

/**
 * The interface font. Everything you read that is not code is set in this —
 * the tree, the tabs, the status bar, the terminal's own chrome. The app used
 * to hand the monospace to all of it, which is the single thing that made it
 * read as a terminal emulator rather than a product.
 */
/* Headlines only: the page's question, a section's name, a figure. */
export const HEADLINE_FONT = `"Stack Sans Headline", "Manrope", -apple-system,
  BlinkMacSystemFont, sans-serif`;

/* Everything else is Stack Sans Text — the same family's cut for small sizes,
   so the product speaks in the presentation's voice rather than a stand-in's.
   Manrope stays behind it while the face loads. */
const DISPLAY_FONT = `"Stack Sans Text", "Manrope", -apple-system,
  BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;

const SOLANA_V3: ThemeParam = {
  colors: {
    default: {
      bgPrimary: BG_BASE,
      bgSecondary: BG_SIDEBAR,
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
        selection: { bg: "#2563EB3D" },
        searchMatch: { bg: "#2563EB2E" },
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
