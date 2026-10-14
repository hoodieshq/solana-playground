import Default from "./Default";
import Copy from "./Copy";
import Export from "./Export";

const Button = Default as typeof Default & {
  Copy: typeof Copy;
  Export: typeof Export;
};
Button.Copy = Copy;
Button.Export = Export;

export default Button;
