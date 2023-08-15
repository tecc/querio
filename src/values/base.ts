import type { ConditionSpecWithValue } from "../spec";

export interface ValueParser<T> {
    (value: string): T;
}

export function wrap<
    S extends ConditionSpecWithValue<T>,
    T = ReturnType<S["parse"]>
>(spec: S): S & ValueParser<T> {
    return Object.assign(function (value: string) {
        return spec.parse(value);
    }, spec);
}

export function ensureIsNotBad<T>(value: T | null | undefined): T {
    if (value == null) {
        throw new Error("Parsed value is null");
    }
    if (Number.isNaN(value)) {
        throw new Error("Parsed value is NaN (not a number)");
    }
    return value;
}
export function noBadValues<T>(
    f: (value: string) => T | null | undefined
): (value: string) => T {
    return (v) => {
        const parsed = f(v);
        return ensureIsNotBad(parsed);
    };
}

export const parseIntSafe = noBadValues(parseInt);
