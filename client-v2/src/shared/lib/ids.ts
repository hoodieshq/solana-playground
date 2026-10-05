import { v4, validate } from "uuid";

/**
 * A v4 UUID.
 *
 * `crypto.randomUUID` is not called directly: browserslist still claims
 * Safari 14, which has `getRandomValues` but not `randomUUID`. `uuid`'s
 * browser build is built on `getRandomValues`, so it answers there too, and
 * the fallback is the library's problem rather than hand-rolled bit twiddling
 * of ours.
 *
 * Ids are minted on the client so an append is safely repeatable -- the same
 * message dumped twice, or from three devices, collapses on the primary key
 * instead of duplicating.
 *
 * Named rather than re-exported so every caller keeps saying `uuid()` and the
 * reason above has somewhere to live.
 */
export const uuid = (): string => v4();

/**
 * Whether `value` is a UUID of any RFC 4122 version.
 *
 * The one place the UUID shape is known. Everything that checks an id --
 * a route guarding a parameter, a test asserting on a minted id -- calls this
 * rather than carrying its own regex, so the shape is stated once and a
 * reviewer can see every check by searching for the name.
 */
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && validate(value);
