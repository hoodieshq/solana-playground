import { cn } from "cn";

import Img from "../../../components/Img";
import LangIcon from "../../../components/LangIcon";
import { PgFramework, PgLanguage } from "../../../utils";
import { BaseDetailTag, type BaseDetailTagProps } from "./BaseDetailTag";

type DetailTagProps = {
  kind: BaseDetailTagProps["kind"];
  value: string;
  className?: string;
};

function DetailTag({ kind, value, className }: DetailTagProps) {
  return (
    <BaseDetailTag
      kind={kind}
      label={value}
      icon={iconOf(kind, value)}
      className={className}
    />
  );
}

function iconOf(kind: string, value: string) {
  if (kind === "framework") {
    // An unknown framework shows its name alone
    const framework = PgFramework.get(value as FrameworkName);
    if (!framework) return null;
    return (
      <Img
        src={framework.icon}
        className={cn(framework.circleImage && "rounded-full")}
      />
    );
  }
  if (kind === "languages") {
    const extension = PgLanguage.all.find((l) => l.name === value)
      ?.extensions[0];
    return <LangIcon path={`file.${extension}`} />;
  }
  return null;
}

export { DetailTag };
