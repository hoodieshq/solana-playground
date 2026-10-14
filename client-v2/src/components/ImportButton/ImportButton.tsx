import {
  ChangeEvent,
  ComponentProps,
  FC,
  PropsWithChildren,
  useRef,
  useState,
} from "react";
import styled, { css } from "styled-components";

import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { Button } from "@/shared/ui/button";

interface ImportButtonProps {
  onImport: (ev: ChangeEvent<HTMLInputElement>) => Promise<void>;
  accept?: string;
  showImportText?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
  noButton?: boolean;
  dir?: boolean;
  title?: string;
}

const ImportButton: FC<PropsWithChildren<ImportButtonProps>> = ({
  onImport,
  accept,
  variant = "outline",
  showImportText,
  noButton,
  dir,
  title,
  children,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const [importText, setImportText] = useState("");

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (ev: ChangeEvent<HTMLInputElement>) => {
    try {
      await onImport(ev);
    } catch (error) {
      // The picker has no other way to say it failed, and the file name
      // below would claim it was imported
      reportButtonFailure(error);
      setImportText("");
      return;
    }
    const files = ev.target.files;
    if (!files?.length) setImportText("");
    else setImportText(files[0].name);
  };

  const dirProps = dir
    ? { webkitdirectory: "", mozdirectory: "", directory: "", multiple: true }
    : {};

  return (
    <Wrapper>
      <input
        ref={inputRef}
        type="file"
        onChange={handleChange}
        accept={accept}
        {...dirProps}
      />
      {noButton ? (
        <div onClick={handleClick}>{children}</div>
      ) : (
        <Button variant={variant} title={title} onClick={handleClick}>
          {children}
        </Button>
      )}
      {showImportText && importText && <ImportInfo>{importText}</ImportInfo>}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  align-items: center;

  & input[type="file"] {
    display: none;
  }

  & > div {
    width: 100%;
  }
`;

const ImportInfo = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.small};
    margin-left: 0.5rem;
  `}
`;

export default ImportButton;
