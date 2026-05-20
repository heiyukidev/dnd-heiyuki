/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as characterClasses from "../characterClasses.js";
import type * as characterRaces from "../characterRaces.js";
import type * as characterSheetValidators from "../characterSheetValidators.js";
import type * as defaultCharacterSheet from "../defaultCharacterSheet.js";
import type * as devTools from "../devTools.js";
import type * as sessionCharacterPersist from "../sessionCharacterPersist.js";
import type * as sessions from "../sessions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  characterClasses: typeof characterClasses;
  characterRaces: typeof characterRaces;
  characterSheetValidators: typeof characterSheetValidators;
  defaultCharacterSheet: typeof defaultCharacterSheet;
  devTools: typeof devTools;
  sessionCharacterPersist: typeof sessionCharacterPersist;
  sessions: typeof sessions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
