import {
  addInit,
  addOnDidChange,
  INTERNAL_STATE_PROPERTY,
  ON_DID_CHANGE,
} from "./common";
import { PgCommon } from "../common";
import type {
  Initialize,
  OnDidChangeDefault,
  OnDidChangeProperty,
} from "./types";
import type { Disposable, SyncOrAsync } from "../types";

/** Updatable decorator */
type Update<T> = {
  /** Update state */
  update(params: Partial<T>): void;
};

/** Recursive `onDidChange${propertyName}` method types */
type OnDidChangePropertyRecursive<T, U = FlattenObject<T>> = {
  [K in keyof U as `${typeof ON_DID_CHANGE}${Capitalize<K>}`]: (
    cb: (value: U[K]) => void
  ) => Disposable;
};

/** Custom storage implementation */
type CustomStorage<T> = {
  /** Read from storage and deserialize the data. */
  read(): SyncOrAsync<T>;
  /** Serialize the data and write to storage. */
  write(state: T): SyncOrAsync<void>;
};

/**
 * Make a static class updatable.
 *
 * This decorator defines getters for the given prop names and adds an
 * `onDidChange${propertyName}` method for each prop.
 *
 * `update` method is responsible for both updating the state and dispatching
 * change events.
 *
 * NOTE: Types have to be added separately as decorators don't have proper
 * type support.
 */
export function updatable<T>(params: {
  /** Default value to set */
  defaultState: Required<T>;
  /** Storage that is responsible with de/serialization */
  storage?: CustomStorage<T>;
  /** Whether to add proxy setters recursively */
  recursive?: boolean;
}) {
  return (sClass: any) => {
    // Add `onDidChange` methods
    addOnDidChange(sClass, params.defaultState, params.recursive);

    // Add `init` method
    addInit(sClass, async () => {
      const state: T = params.storage
        ? await params.storage.read()
        : params.defaultState;

      // Set the default if any prop is missing(recursively)
      const setMissingDefaults = (state: any, defaultState: any) => {
        if (Array.isArray(state)) return;

        for (const prop in defaultState) {
          if (state[prop] === undefined) {
            state[prop] = defaultState[prop];
          } else if (
            typeof state[prop] === "object" &&
            defaultState[prop] !== null
          ) {
            setMissingDefaults(state[prop], defaultState[prop]);
          }
        }
      };
      setMissingDefaults(state, params.defaultState);

      // Remove extra properties if a prop was removed(recursively)
      const removeExtraProperties = (state: any, defaultState: any) => {
        if (Array.isArray(state)) return;

        for (const prop in state) {
          if (defaultState[prop] === undefined) {
            delete state[prop];
          } else if (
            typeof state[prop] === "object" &&
            defaultState[prop] !== null
          ) {
            removeExtraProperties(state[prop], defaultState[prop]);
          }
        }
      };
      removeExtraProperties(state, params.defaultState);

      // Set the initial state
      sClass.update(state);

      return sClass.onDidChange((state: T) => params.storage?.write(state));
    });

    // Add `update` method
    if (params.recursive) {
      (sClass as Update<T>).update = (params) => {
        for (const [prop, value] of PgCommon.entries(params)) {
          update(sClass, prop, value);

          if (typeof value === "object" && value !== null) {
            recursivelyDefineSetters(sClass, [prop]);
          }
        }
      };
    } else {
      (sClass as Update<T>).update = (params) => {
        for (const entry of PgCommon.entries(params)) update(sClass, ...entry);
      };
    }
  };
}

/** Update property values. */
const update = <T>(sClass: any, prop: keyof T, value: Partial<T>[keyof T]) => {
  if (value === undefined) return;

  // Define getter and setter once
  if (!Object.hasOwn(sClass, prop)) {
    Object.defineProperty(sClass, prop, {
      get: () => sClass[INTERNAL_STATE_PROPERTY][prop],
      set: (value: T[keyof T]) => {
        sClass[INTERNAL_STATE_PROPERTY][prop] = value;
        sClass._dispatchChangeEvent(prop);
      },
    });
  }

  // Trigger the setter
  sClass[prop] = value;
};

/** Define proxy setters for properties recursively. */
const recursivelyDefineSetters = (sClass: any, propNames: string[]) => {
  const parent = PgCommon.getValue(sClass, propNames.slice(0, -1)) ?? sClass;
  const lastProp = propNames.at(-1)!;
  parent[lastProp] = new Proxy(
    PgCommon.getValue(sClass[INTERNAL_STATE_PROPERTY], propNames),
    {
      set(target: any, prop: string, value: any) {
        target[prop] = value;

        // Setting a new value should dispatch a change event for all of the
        // parent objects. For example:
        //
        // ```
        // const obj = { nested: { number: 1 } };
        // obj.nested.number = 2;
        // ```
        //
        // Should trigger `onDidChangeNestedNumber`, `onDidChangeNested`, `onDidChange`.

        // 1. [nested, number].reduce
        // 2. [nested, nested.number].reverse
        // 3. [nested.number, nested].forEach
        propNames
          .concat([prop])
          .reduce((acc, cur, i) => {
            acc.push(propNames.slice(0, i).concat([cur]).join("."));
            return acc;
          }, [] as string[])
          .reverse()
          .forEach(sClass._dispatchChangeEvent);

        return true;
      },
    }
  );

  const current = parent[lastProp];
  for (const [prop, value] of PgCommon.entries(current)) {
    if (typeof value === "object" && value !== null) {
      // Recursively update
      recursivelyDefineSetters(sClass, [...propNames, prop]);
    } else {
      // Trigger the setter via self-assign
      current[prop] = value;
    }
  }
};

/**
 * Flatten the properties of the given object.
 *
 * ## Input:
 * ```ts
 * {
 *   isReady: boolean;
 *   nested: {
 *     id: number;
 *     double: {
 *       name: string;
 *     };
 *   };
 * }
 * ```
 *
 * ## Output:
 * ```ts
 * {
 *   isReady: boolean;
 *   nested: {
 *     id: number;
 *     double: {
 *       name: string;
 *     };
 *   }
 *   nestedId: number;
 *   nestedDouble: {
 *     name: string;
 *   }
 *   nestedDoubleName: string;
 * }
 * ```
 */
type FlattenObject<T, U = PropertiesToUnionOfTuples<T>> = MapNestedProperties<
  // This check solves `Type instantiation is excessively deep and possibly infinite.`
  U extends [string[], unknown] ? U : never
>;

/** Maps the given tuple to an object */
type MapNestedProperties<T extends [string[], unknown]> = {
  [K in T as Uncapitalize<JoinCapitalized<K[0]>>]: K[1];
};

/** Join the given string array capitalized */
type JoinCapitalized<T extends string[]> = T extends [
  // infer Head extends string,
  // ...infer Tail extends string[]
  infer Head,
  ...infer Tail
]
  ? Head extends string
    ? Tail extends string[]
      ? `${Capitalize<Head>}${JoinCapitalized<Tail>}`
      : never
    : never
  : "";

/** Map the property values to a union of tuples */
type PropertiesToUnionOfTuples<T, Acc extends string[] = []> = {
  [K in keyof T]: T[K] extends object
    ? [[...Acc, K], T[K]] | PropertiesToUnionOfTuples<T[K], [...Acc, K]>
    : [[...Acc, K], T[K]];
}[keyof T];

/**
 * Add the necessary types to the given updatable static class.
 *
 * @param sClass static class
 * @param options type helper options
 * @returns the static class with correct types
 */
export const declareUpdatable = <C, T, R>(
  sClass: C,
  options?: { defaultState: T; recursive?: R }
) => {
  return sClass as unknown as Omit<C, "prototype"> &
    T &
    Initialize &
    Update<T> &
    OnDidChangeDefault<T> &
    (R extends boolean
      ? OnDidChangePropertyRecursive<T>
      : OnDidChangeProperty<T>);
};
