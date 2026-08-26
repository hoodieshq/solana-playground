import type { ThemeParam } from "../../utils";

// Tokens from docs/design/brand-research.md — values found in solana.com's own
// served CSS, not invented. See the research doc before changing any of these.

// Surfaces: a violet-black family, matching solana.com's #1d1a23 tint.
const BG_BASE = "#000000", // chrome: rail, topbar, status bar, terminal
  BG_SURFACE = "#0F0D13", // editor, panels
  BG_RAISED = "#1A1721", // cards, inputs, menus
  BG_HOVER = "#262230",
  // Brand
  PURPLE = "#9945FF",
  GREEN = "#14F195",
  CYAN = "#80ECFF",
  PINK = "#EB54BC",
  // The canonical gradient, verbatim from solana.com's CSS
  GRADIENT = `linear-gradient(135deg, ${PURPLE} 10%, ${GREEN} 90%)`,
  // Text: slightly lavender whites, not pure gray
  TEXT_PRIMARY = "#ECEBF1",
  TEXT_SECONDARY = "#9C98A9",
  // Lavender-white borders at low alpha — solana.com's own trick
  BORDER = "#ECE4FD1F",
  BORDER_STRONG = "#ECE4FD33",
  // States tuned to sit in the palette
  RED = "#FF4D6A",
  YELLOW = "#FFD666",
  DISABLED_BG = "#111016",
  // Syntax
  COMMENT = "#6E6880";

/**
 * Corner radius of every floating panel, in both layouts -- the classic
 * editor/terminal/sidebar cards and Flow's left/center/right columns, which
 * read it back through `theme.default.borderRadius`.
 */
const PANEL_RADIUS = "12px";

/** Display font for chrome (titles, buttons, topbar); code stays monospace */
const DISPLAY_FONT = `"Space Grotesk", -apple-system, BlinkMacSystemFont,
  "Segoe UI", Helvetica, Arial, sans-serif`;

const SOLANA_V2: ThemeParam = {
  colors: {
    default: {
      bgPrimary: BG_BASE,
      bgSecondary: BG_SURFACE,
      primary: PURPLE,
      secondary: GREEN,
      textPrimary: TEXT_PRIMARY,
      textSecondary: TEXT_SECONDARY,
      border: BORDER,
    },
    state: {
      disabled: { bg: DISABLED_BG, color: TEXT_SECONDARY },
      error: { color: RED },
      hover: { bg: BG_HOVER, color: "#B4B0C0" },
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
    boxShadow: "rgba(0, 0, 0, 0.5) 0px 8px 32px",
  },

  components: {
    button: {
      default: {
        borderRadius: "9999px",
        fontFamily: DISPLAY_FONT,
      },
      overrides: {
        primary: {
          color: TEXT_PRIMARY,
          hover: { bg: "#A95FFF" },
        },
        outline: {
          border: `1px solid ${BORDER_STRONG}`,
          hover: {
            bg: BG_HOVER,
            borderColor: BORDER_STRONG,
          },
        },
      },
    },
    editor: {
      default: {
        bg: "transparent",
        activeLine: { borderColor: BORDER },
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
      padding: "0.4375rem 0.75rem",
    },
    menu: {
      default: {
        bg: BG_RAISED,
        border: `1px solid ${BORDER}`,
      },
    },
    modal: {
      default: {
        bg: "rgba(26, 23, 33, 0.9)",
        border: `1px solid ${BORDER}`,
        boxShadow: "rgba(0, 0, 0, 0.6) 0px 16px 48px",
      },
    },
    progressbar: {
      indicator: { bg: GRADIENT },
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
          // No boxed dividers between tabs — the current tab stands out by
          // surface + accent instead
          borderRightColor: "transparent",
          hover: { bg: BG_HOVER },
        },
        current: {
          bg: BG_SURFACE,
          color: TEXT_PRIMARY,
          borderTopColor: PURPLE,
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
      },
      progress: { bg: GRADIENT },
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
      // The floating panels above never touch the status bar - a divider
      // would be a line hanging in empty black
      borderTop: "none",
    },
    main: {
      // Floating-panel composition: the main column is part of the black
      // canvas; editor and terminal are inset cards separated by 8px gutters
      default: {
        bg: BG_BASE,
        padding: "0.5rem 0.5rem 0.5rem 0.5rem",
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
          // Home is a content surface - prose belongs to the display font
          default: { bg: BG_SURFACE, fontFamily: DISPLAY_FONT },
          title: {
            fontFamily: DISPLAY_FONT,
            fontSize: "2.25rem",
            fontWeight: 700,
            letterSpacing: "-0.01em",
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
        // The terminal floats as its own black card - one shade below the
        // editor surface, delineated by the border instead of a divider
        default: {
          bg: BG_BASE,
          border: `1px solid ${BORDER}`,
          // Override the default purple divider - the card border does the job
          borderTop: `1px solid ${BORDER}`,
          borderRadius: PANEL_RADIUS,
          overflow: "hidden",
        },
      },
    },
    sidebar: {
      // The gap separates the rail from the floating page panel; vertical
      // padding aligns the panel with the editor card next to it
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
          // Rounded 40px squares centered in the rail instead of full-width
          // strips; the active page is a raised pill, not a border edge
          default: {
            width: "2.5rem",
            height: "2.5rem",
            margin: "0.25rem 0",
            borderRadius: "10px",
            hover: { bg: BG_HOVER },
          },
          selected: {
            bg: BG_RAISED,
            // Set every side explicitly - the defaults machinery appends
            // borderLeft/borderRight *after* these, so shorthand alone
            // would be overridden by the legacy 2px edge marker
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
          // The wrapper hardcodes `calc(100vh - bottom)` before this block;
          // subtract the 2x0.5rem vertical gutters the Side wrapper adds
          height: "calc(100vh - 1.5rem - 1rem)",
        },
        title: {
          // 40px panel header on the 8px rhythm
          height: "2.5rem",
          fontFamily: DISPLAY_FONT,
          fontSize: "1rem",
          fontWeight: 500,
          letterSpacing: "0.04em",
          // Left-aligned header row instead of the legacy centered banner.
          // Later declarations here override the wrapper's hardcoded
          // `justify-content: center`, so no component edit is needed.
          justifyContent: "flex-start",
          paddingLeft: "1rem",
        },
      },
    },
  },

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

export default SOLANA_V2;
