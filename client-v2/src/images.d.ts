/**
 * Image imports.
 *
 * Create React App normally supplies these through `react-scripts`' own
 * ambient types, pulled in by a `react-app-env.d.ts` this project does not
 * have. Without them an imported PNG is a missing module to TypeScript even
 * though webpack resolves it happily, so the build passes and the editor does
 * not. Declaring the handful we actually use is enough.
 */
declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}
