import type { ConditionSpecWithValue } from "../spec";
import type { CompareResult } from "../util";
import { complexityOf } from "../complexity";
import { type ValueParser, wrap } from "./base";

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

type AnyOpType<T> =
    | ValueWithBinaryOp<T>
    | ValueWithReducedBinaryOp<T>
    | ValueWithSpeciallyReducedBinaryOp<T>;

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

    /*type Reduction = typeof reduce extends undefined
        ? ValueWithReducedBinaryOp<T>
        : ValueWithSpeciallyReducedBinaryOp<T>;*/

    type Reduction =
        | ValueWithReducedBinaryOp<T>
        | ValueWithSpeciallyReducedBinaryOp<T>;

    const reduced = (value: string): Reduction => {
        const literal = base(value);
        switch (literal.operator) {
            case BinaryOperator.GreaterThanOrEqualTo:
                if (reduce != null) {
                    return {
                        operator: ReducedBinaryOperator.GreaterThan,
                        value: reduce(literal.value, -1)
                    };
                } else {
                    return {
                        operator: ReducedBinaryOperator.LessThan,
                        value: literal.value,
                        not: true
                    };
                }
            case BinaryOperator.LessThanOrEqualTo:
                if (reduce != null) {
                    return {
                        operator: ReducedBinaryOperator.LessThan,
                        value: reduce(literal.value, 1)
                    };
                } else {
                    return {
                        operator: ReducedBinaryOperator.GreaterThan,
                        value: literal.value,
                        not: true
                    };
                }
            default:
                if (reduce != null) {
                    // This is safe because the values share types
                    return literal as unknown as ValueWithSpeciallyReducedBinaryOp<T>;
                } else {
                    return {
                        ...literal,
                        not: false
                    } as unknown as ValueWithReducedBinaryOp<T>;
                }
        }
    };

    type ReducedSpec<T> = T extends Reduction
        ? ValueParser<T> & ConditionSpecWithValue<T>
        : never;

    const compare = <A extends AnyOpType<T>>(a: A, b: typeof a) =>
        compareBinaryOps(a, b, (a: T, b: T) => spec.compare(a, b));

    /*
     * What follows here is some highly refined horribleness that *shouldn't* have a bug.
     * It uses bad type assertions to make the typings work because they *should*.
     */
    const reducedSpec = wrap({
        parse: (input) => reduced(input),
        compare,
        complexity: <A extends Reduction>(value: A): number => {
            const not = value["not"] ?? false;
            // spec.complexity should always include the base 1
            return (not ? 1 : 0) + complexityOf(value.value, spec.complexity);
        }
    }) as unknown as ReducedSpec<Reduction>;

    return wrap<
        ConditionSpecWithValue<ValueWithBinaryOp<T>> & {
            reduced: ReducedSpec<Reduction>;
        }
    >({
        parse: base,
        compare,
        complexity: (value: ValueWithBinaryOp<T>) =>
            complexityOf(value.value, spec.complexity),
        reduced: reducedSpec
    }) as unknown as BinaryOpParser<T> | SpecialBinaryOpParser<T>;
}
