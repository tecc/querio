export type ValueParser<T> = (value: string) => T;

export const string: ValueParser<string> = function (value) {
    return value;
};
export const int: ValueParser<number> = function (value) {
    return parseInt(value);
};
export const float: ValueParser<number> = function (value) {
    return parseFloat(value);
};

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
export interface BinaryOpParser<T, R = ValueWithReducedBinaryOp<T>>
    extends ValueParser<ValueWithBinaryOp<T>> {
    /**
     * A parser that produces a reduced operator.
     * This is mainly here for convenience, and is not actually recommended due to the possibility of underflow/overflow.
     */
    reduced: ValueParser<R>;
}
export type SpecialBinaryOpParser<T> = BinaryOpParser<
    T,
    ValueWithSpeciallyReducedBinaryOp<T>
>;

type CustomReduction<T> = (value: T, diff: 1 | -1) => T;

export function binaryOperator<T>(wrapped: ValueParser<T>): BinaryOpParser<T>;
export function binaryOperator<T>(
    wrapped: ValueParser<T>,
    reduce: CustomReduction<T>
): SpecialBinaryOpParser<T>;
export function binaryOperator<T>(
    wrapped: ValueParser<T>,
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

        return {
            value: wrapped(value.substring(oplen)),
            operator
        } satisfies ValueWithBinaryOp<T>;
    };

    const reduced: typeof reduce extends undefined
        ? BinaryOpParser<T>["reduced"]
        : SpecialBinaryOpParser<T>["reduced"] = (value: string) => {
        const literal = base(value);
        switch (literal.operator) {
            case BinaryOperator.GreaterThanOrEqualTo:
                if (reduce) {
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
                if (reduce) {
                    return {
                        operator: ReducedBinaryOperator.LessThan,
                        value: reduce(literal.value, 1)
                    };
                } else {
                    return {
                        operator: ReducedBinaryOperator.GreaterThan,
                        value: reduce(literal.value, -1),
                        not: false
                    };
                }
            default:
                if (reduce) {
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

    const assigned = Object.assign(base, {
        reduced
    });

    return assigned as typeof reduce extends undefined
        ? BinaryOpParser<T>
        : SpecialBinaryOpParser<T>;
}

export const intWithBinaryOp = binaryOperator(
    int,
    (value, diff) => value + diff
);

export function mapped<T, U>(
    original: ValueParser<T>,
    mapper: (value: T) => U
): ValueParser<U> {
    return function (value: string) {
        return mapper(original(value));
    };
}
