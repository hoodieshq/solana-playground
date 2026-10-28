import { FC, useMemo } from "react";

import { PgLanguage, PgView } from "../../utils";
import { QuestionMark } from "../Icons";

interface LangIconProps {
  /** File path to decide the language from */
  path: string;
}

const LangIcon: FC<React.PropsWithChildren<LangIconProps>> = ({ path }) => {
  const Icon = useMemo(() => {
    const lang = PgLanguage.getFromPath(path);
    if (!lang) return <QuestionMark />;
    return PgView.normalizeElement(lang.icon, { path });
  }, [path]);

  return (
    <div className="h-4 w-4 [&>img]:h-full [&>img]:w-full [&>svg]:h-full [&>svg]:w-full">
      {Icon}
    </div>
  );
};

export default LangIcon;
