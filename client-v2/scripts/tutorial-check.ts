// Check conversation tutorial definitions: `yarn tutorial:check [<slug> | <dir>]`.
//
// With no argument it checks every `src/tutorials/<slug>/tutorial.json`
// (folders starting with `_` aside). Each error prints as its JSON path, what
// was expected and what was found; any error exits with code 1.

import fs from "fs";
import path from "path";

import {
  checkDefinition,
  formatError,
} from "../src/entities/tutorial/model/definition/check";

const CLIENT = path.join(__dirname, "..");
const TUTORIALS = path.join(CLIENT, "src", "tutorials");
const DEFINITION = "tutorial.json";

const folders = (dir: string) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !/^[_.]/.test(e.name))
        .map((e) => e.name)
    : [];

/** Every tutorial a definition's `next` may name: definitions, custom and Markdown tutorials */
const known = new Set([
  ...folders(TUTORIALS),
  ...folders(path.join(CLIENT, "public", "tutorials")),
  ...folders(path.join(CLIENT, "..", "client", "public", "tutorials")),
]);

/** The folders to check, from the argument */
const targets = (arg: string | undefined): string[] => {
  if (arg === undefined) {
    return folders(TUTORIALS)
      .map((slug) => path.join(TUTORIALS, slug))
      .filter((dir) => fs.existsSync(path.join(dir, DEFINITION)));
  }
  const dir = fs.existsSync(arg)
    ? path.resolve(arg)
    : path.join(TUTORIALS, arg);
  if (!fs.existsSync(path.join(dir, DEFINITION))) {
    console.error(`${arg}: no ${DEFINITION} in ${path.relative(CLIENT, dir)}`);
    process.exit(1);
  }
  return [dir];
};

let failed = 0;
for (const dir of targets(process.argv[2])) {
  const slug = path.basename(dir);
  let json: unknown;
  try {
    json = JSON.parse(fs.readFileSync(path.join(dir, DEFINITION), "utf8"));
  } catch (e) {
    console.log(`${slug}/${DEFINITION}: not JSON, ${(e as Error).message}`);
    failed++;
    continue;
  }
  const errors = checkDefinition(json, known, slug);
  if (errors.length === 0) {
    console.log(`${slug}: ok`);
    continue;
  }
  failed++;
  console.log(
    `${slug}: ${errors.length} error${errors.length === 1 ? "" : "s"}`
  );
  for (const error of errors) console.log(formatError(error));
}
process.exit(failed === 0 ? 0 : 1);
