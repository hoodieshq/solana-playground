import { FC, useEffect, useState } from "react";
import styled, {
  css,
  ThemeProvider as StyledThemeProvider,
} from "styled-components";

import { FONTS, THEMES } from "../../themes";
import { PgCommon } from "../../utils/common";
import { PgTheme, Theme } from "../../utils/theme";

export const ThemeProvider: FC = ({ children }) => {
  const [theme, setTheme] = useState<Theme>();

  // Create the initial theme
  useEffect(() => {
    PgTheme.create(THEMES, FONTS);
  }, []);

  // Set theme when the current theme name or font family changes
  useEffect(() => {
    return PgCommon.batchChanges(
      () => setTheme(PgTheme.theme),
      [PgTheme.onDidChangeThemeName, PgTheme.onDidChangeFontFamily]
    ).dispose;
  }, []);

  if (!theme) return null;

  return (
    <StyledThemeProvider theme={theme}>
      <Wrapper>{children}</Wrapper>
    </StyledThemeProvider>
  );
};

// Set default theme values
const Wrapper = styled.div`
  ${({ theme }) => css`
    background: ${theme.colors.default.bgPrimary};
    color: ${theme.colors.default.textPrimary};
    /* The interface is set in the UI font, not the code font. This line used
       to hand the monospace to the whole app, which is why every label, tab,
       tree row and status chip read like a terminal transcript. Code declares
       its own face where code actually lives — the editor, the terminal, code
       blocks and inline code in Markdown all set it themselves. */
    font-family: ${theme.font.other.family};
    font-size: ${theme.font.other.size.small};

    & ::selection {
      background: ${theme.colors.default.primary +
      theme.default.transparency.medium};
    }
  `}
`;
