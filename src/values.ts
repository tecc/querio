import type { ConditionSpec, ConditionSpecWithValue } from "./spec";
import type { CompareResult } from "./util";
import { compareNumbers, compareStrings } from "./util";

export interface ValueParser<T> {
    (value: string): T;
}

function wrap<T, S extends ConditionSpec<T>>(spec: S): S & ValueParser<T> {
    return Object.assign(function (value: string) {
        return spec.parse(value);
    }, spec);
}
function noBadValues<T>(
    f: (value: string) => T | null | undefined
): (value: string) => T {
    return (v) => {
        const parsed = f(v);
        if (parsed == null) {
            throw new Error("Parsed value is null");
        }
        if (Number.isNaN(parsed)) {
            throw new Error("Parsed value is NaN (not a number)");
        }
        return parsed;
    };
}

export const string = wrap({
    parse: (value) => value,
    compare: compareStrings
});

export const int = wrap({
    parse: noBadValues(parseInt),
    compare: compareNumbers
});
export const float = wrap({
    parse: noBadValues(parseFloat),
    compare: compareNumbers
});

export enum BinaryOperator {
    EqualTo = "=",
    NotEqualTo = "!=",
    LessThan = "<",
    LessThanOrEqualTo = "<=",
    GreaterThanOrEqualTo = ">=",
    GreaterThan = ">"
}
export enum ReducedBinaryOperator {
    EqualTo = "=",
    NotEqualTo = "!=",
    LessThan = "<",
    GreaterThan = ">"
}

export interface ValueWithBinaryOp<T> {
    value: T;
    operator: BinaryOperator;
}
export interface ValueWithReducedBinaryOp<T> {
    value: T;
    operator: ReducedBinaryOperator;
    not: boolean;
}
export interface ValueWithSpeciallyReducedBinaryOp<T> {
    value: T;
    operator: ReducedBinaryOperator;
}
export interface BinaryOpParser<
    T,
    R = ValueWithReducedBinaryOp<T>,
    O = ValueWithBinaryOp<T>
> extends ValueParser<O>,
        ConditionSpecWithValue<O> {
    /**
     * A parser that produces a reduced operator.
     * This is mainly here for convenience, and is not actually recommended due to the possibility of underflow/overflow.
     */
    reduced: ValueParser<R> & ConditionSpecWithValue<R>;
}
export type SpecialBinaryOpParser<T> = BinaryOpParser<
    T,
    ValueWithSpeciallyReducedBinaryOp<T>
>;

type CustomReduction<T> = (value: T, diff: 1 | -1) => T;

const OPERATOR_PRIORITIES = [
    BinaryOperator.EqualTo,
    BinaryOperator.NotEqualTo,
    BinaryOperator.LessThan,
    BinaryOperator.LessThanOrEqualTo,
    BinaryOperator.GreaterThanOrEqualTo,
    BinaryOperator.GreaterThan
];

function compareBinaryOps<T>(
    a:
        | ValueWithBinaryOp<T>
        | ValueWithReducedBinaryOp<T>
        | ValueWithSpeciallyReducedBinaryOp<T>,
    b: typeof a,
    compareValue: (a: T, b: T) => CompareResult
): CompareResult {
    if (typeof a["not"] === "boolean") {
        const aNot: boolean = a["not"],
            bNot: boolean = b["not"];
        if (aNot !== bNot) {
            // Because aNot and bNot being the same are now impossible,
            // checking aNot is all we need to do to determine which one should be first.
            // `false` should always come first in the ordering, so it's considered "less".
            return aNot ? 1 : -1;
        }
    }
    if (a.operator === b.operator) {
        return compareValue(a.value, b.value);
    }

    const ia = OPERATOR_PRIORITIES.findIndex((el) => el === a.operator)!;
    for (let ib = 0; ib < ia; ib++) {
        if (OPERATOR_PRIORITIES[ib] === b.operator) {
            return 1;
        }
    }
    return -1;
}

export function binaryOperator<T>(
    spec: ConditionSpecWithValue<T>,
    reduction?: undefined
): BinaryOpParser<T>;
export function binaryOperator<T>(
    spec: ConditionSpecWithValue<T>,
    reduction: CustomReduction<T>
): SpecialBinaryOpParser<T>;
export function binaryOperator<T>(
    spec: ConditionSpecWithValue<T>,
    reduce?: CustomReduction<T>
): BinaryOpParser<T> | SpecialBinaryOpParser<T> {
    const base: ValueParser<ValueWithBinaryOp<T>> = (value) => {
        let operator = BinaryOperator.EqualTo,
            oplen = 2;
        switch (value.substring(0, 2)) {
            case "!=":
                operator = BinaryOperator.NotEqualTo;
                break;
            case "<=":
                operator = BinaryOperator.LessThanOrEqualTo;
                break;
            case ">=":
                operator = BinaryOperator.GreaterThanOrEqualTo;
                break;
            default:
                oplen = 1;
        }
        if (oplen === 1) {
            switch (value.substring(0, 1)) {
                case "=":
                    operator = BinaryOperator.EqualTo;
                    break;
                case "<":
                    operator = BinaryOperator.LessThan;
                    break;
                case ">":
                    operator = BinaryOperator.GreaterThan;
                    break;
                default:
                    oplen = 0;
            }
        }

        return {
            value: spec.parse(value.substring(oplen)),
            operator
        } satisfies ValueWithBinaryOp<T>;
    };

    type Reduction = typeof reduce extends undefined
        ? ValueWithReducedBinaryOp<T>
        : ValueWithSpeciallyReducedBinaryOp<T>;

    const reduced = (value: string): Reduction => {
        const literal = base(value);
        switch (literal.operator) {
            case BinaryOperator.GreaterThanOrEqualTo:
                if (reduce != null) {
                    return {
                        operator: ReducedBinaryOperator.GreaterThan,
                        value: reduce(literal.value, -1)
                    } as Reduction;
                } else {
                    return {
                        operator: ReducedBinaryOperator.LessThan,
                        value: literal.value,
                        not: true
                    } as Reduction;
                }
            case BinaryOperator.LessThanOrEqualTo:
                if (reduce != null) {
                    return {
                        operator: ReducedBinaryOperator.LessThan,
                        value: reduce(literal.value, 1)
                    } as Reduction;
                } else {
                    return {
                        operator: ReducedBinaryOperator.GreaterThan,
                        value: literal.value,
                        not: true
                    } as Reduction;
                }
            default:
                if (reduce != null) {
                    // This is safe because the values share types
                    return literal as unknown as Reduction;
                } else {
                    return {
                        ...literal,
                        not: false
                    } as unknown as Reduction;
                }
        }
    };

    const compare = (
        a:
            | ValueWithBinaryOp<T>
            | ValueWithReducedBinaryOp<T>
            | ValueWithSpeciallyReducedBinaryOp<T>,
        b: typeof a
    ) => compareBinaryOps(a, b, (a: T, b: T) => spec.compare(a, b));

    return wrap({
        parse: base,
        compare,
        reduced: wrap({
            parse: reduced,
            compare
        })
    });
}

export const intWithBinaryOp = binaryOperator<number>(
    int,
    (value, diff) => value + diff
);
export const floatWithBinaryOp = binaryOperator<number>(float);

export function mapped<T, U>(
    original: ValueParser<T>,
    mapper: (value: T) => U
): ValueParser<U> {
    return function (value: string) {
        return mapper(original(value));
    };
}
