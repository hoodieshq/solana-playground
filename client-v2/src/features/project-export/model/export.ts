import { addImports, getJSDependencyMap } from "@/frameworks/common";
import type { TupleFiles } from "@/utils";
import { PgConnection, PgExplorer, PgFramework } from "@/utils";

import type { ConvertedProfile, ConvertProfile } from "./telemetry";
import { projectExportTelemetry } from "./telemetry";
import { toNodeProjectWith, toPublicEndpoint } from "./typescript-profile";

/** Whether a project converts with its framework or with the TypeScript profile */
export type ProjectKind = "program" | "no-program";

/**
 * The frameworks as the events name them; keyed by every `FrameworkName`, so
 * a new framework does not compile until it has a profile here and in
 * `ConvertedProfile`
 */
const FRAMEWORK_PROFILES: Record<FrameworkName, ConvertedProfile> = {
  Anchor: "anchor",
  Native: "native",
  Seahorse: "seahorse",
};

/** What `exportProject` throws when the zip itself failed, after any conversion */
class DownloadError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.name = "DownloadError";
  }
}

/**
 * Whether an export failed at the download, not at the conversion: nothing
 * downloaded, and an export as is would fail the same way
 */
export const isDownloadFailure = (error: unknown) =>
  error instanceof DownloadError;

/**
 * The project to export: the named one, or the open one. Empty when there is
 * neither, which `PgFramework.readWorkspaceFiles` refuses.
 */
const nameOf = (name: string | undefined) =>
  name ?? PgExplorer.currentWorkspaceName ?? "";

const kindOf = (files: TupleFiles): ProjectKind =>
  PgFramework.hasProgram(files.map(([path]) => path))
    ? "program"
    : "no-program";

/**
 * Get which conversion "Convert and export" would use for a project.
 *
 * @param name the project; the open one by default
 * @returns `program` when a Rust or Python file sits under `src/`
 */
export const getProjectKind = async (name: string | undefined) =>
  kindOf(await PgFramework.readWorkspaceFiles(nameOf(name)));

/**
 * The endpoint a TypeScript export falls back to, and the one its dialog names:
 * the public endpoint of the cluster Playground is on (`toPublicEndpoint`)
 */
export const exportedEndpoint = () =>
  toPublicEndpoint(PgConnection.cluster, PgConnection.current.rpcEndpoint);

/** Zip and download, telling a failure here from a conversion's */
const download = async (name: string, files: TupleFiles) => {
  try {
    await PgFramework.downloadZip(name, files);
  } catch (e) {
    throw new DownloadError(e);
  }
};

/**
 * Export a project as a zip: converted so it works locally, or as it is.
 *
 * @param opts.name the project; the open one by default
 * @param opts.convert whether to convert: with the project's framework when it
 * has a program, with the TypeScript profile when it has none
 * @returns the README to show after a conversion
 * @throws when the conversion fails (`PgFramework.isUnknownFramework` when no
 * framework recognises the program), and when the zip did not download
 * (`isDownloadFailure`)
 */
export const exportProject = async (opts: {
  name?: string;
  convert: boolean;
}): Promise<{ readme?: string }> => {
  const name = nameOf(opts.name);

  if (!opts.convert) {
    try {
      const files = await PgFramework.readWorkspaceFiles(name);
      await download(name, files);
      projectExportTelemetry.track("export_downloaded", {
        profile: "as-is",
        files: files.length,
      });
      return {};
    } catch (e) {
      projectExportTelemetry.track("export_failed", { profile: "as-is" });
      throw e;
    }
  }

  // The conversion tried, carried to the failure event: `unknown` until the
  // files say, and when no framework recognises the program
  let profile: ConvertProfile = "unknown";
  let converted: { files: TupleFiles; readme: string };
  try {
    const files = await PgFramework.readWorkspaceFiles(name);
    if (kindOf(files) === "program") {
      const framework = await PgFramework.getFromFiles(files);
      if (framework) profile = FRAMEWORK_PROFILES[framework.name];
      converted = await PgFramework.convertToFramework(files);
    } else {
      profile = "typescript";
      converted = await toNodeProjectWith({
        name,
        endpoint: exportedEndpoint(),
        getDependencies: getJSDependencyMap,
        importGlobals: addImports,
      })(files);
    }
  } catch (e) {
    projectExportTelemetry.track("export_convert_failed", {
      profile,
      reason: PgFramework.isUnknownFramework(e) ? "unknown-framework" : "error",
    });
    throw e;
  }

  // `profile` is a converted one here: `unknown` only ever ends in the catch
  const done = profile as ConvertedProfile;
  try {
    await download(name, converted.files);
  } catch (e) {
    projectExportTelemetry.track("export_failed", { profile: done });
    throw e;
  }
  projectExportTelemetry.track("export_downloaded", {
    profile: done,
    files: converted.files.length,
  });
  return { readme: converted.readme };
};
