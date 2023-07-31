import type { CompareResult } from "./util";

/**
 * A parse specification.
 * This object dictates what conditions are allowed and how to parse them.
 *
 * @see {ConditionSpec}
 */
export type ParseSpec<S extends ParseSpec<S>> = {
    [K in Extract<
        Exclude<keyof S, BuiltinCondition<S>["type"]>,
        string
    >]: S[K] extends ConditionSpec<infer T> ? ConditionSpec<T> : never;
};

/** An empty condition specification. Equal to `{}`. */
export type EmptyConditionSpec = Record<string, never>;
export type ConditionSpecWithValue<T> = {
    /**
     * A function that parses an input string to the condition's value type.
     *
     * @param input The input/value. This is what comes after the `:` in conditions.
     */
    parse: (input: string) => T;
    /**
     * A function that compares two of the values returned by {@link parse}.
     * Pretty standard - the return value is `a`s ordering relative to `b`.
     * The return value **must** be either 1 (`a` is greater than `b`), -1 (`a` is less than `b`), or 0 (`a` and `b` are equal).
     *
     * @param a The first of the two values. This is what the result will describe.
     * @param b The second of the two values. This is the reference point; what will be compared against.
     */
    compare: (a: T, b: T) => CompareResult;
};
/**
 * A condition specification.
 * These must either be empty objects (`{}`), or they must have the
 * `parse` and `compare` functions.
 *
 * @see {ConditionSpecWithValue}
 */
export type ConditionSpec<T> = EmptyConditionSpec | ConditionSpecWithValue<T>;

type CustomConditionProps<
    S extends ParseSpec<S>,
    K extends keyof S
> = S[K] extends ConditionSpecWithValue<infer T>
    ? {
          value: T;
      }
    : Record<string, unknown>;
export type CustomCondition<
    S extends ParseSpec<S>,
    K extends keyof S = keyof S
> = K extends keyof S
    ? {
          type: K & string;
      } & CustomConditionProps<S, K>
    : never;
export type BuiltinCondition<S extends ParseSpec<S>> =
    | { type: "not"; operand: Condition<S> }
    | { type: "and"; operands: Array<Condition<S>> }
    | { type: "or"; operands: Array<Condition<S>> };
export type Condition<S extends ParseSpec<S>> =
    | BuiltinCondition<S>
    | CustomCondition<S, keyof S>;
