import { arraysAreEqual } from "./util";

export type ParseSpec<Self extends ParseSpec<Self>> = {
    [K in string]: Self[K] extends ConditionSpec<Self, K>
        ? ConditionSpec<Self, K>
        : never;
};

export type ConditionSpec<
    P extends ParseSpec<P>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _K extends keyof P,
    V = unknown
> = {
    parse?: (value: string) => V;
    compare?: (a: V, b: V) => number;
};

export type BuiltinCondition<P extends ParseSpec<P>> =
    | { type: "not"; operand: Condition<P> }
    | { type: "and"; operands: Array<Condition<P>> }
    | { type: "or"; operands: Array<Condition<P>> };

type ValueProp<C extends ConditionSpec<Record<string, unknown>, string>> =
    C["parse"] extends (value: string) => infer T
        ? { value: T }
        : NonNullable<unknown>;
type CustomConditionProps<
    P extends ParseSpec<P>,
    K extends keyof P
> = P[K] extends ConditionSpec<P, K> ? ValueProp<P[K]> : never;
export type CustomCondition<P extends ParseSpec<P>> = keyof P extends infer K
    ? K extends keyof P
        ? { type: K } & CustomConditionProps<P, K>
        : never
    : never;
export type Equality<P extends ParseSpec<P>> = (
    a: CustomCondition<P>,
    b: CustomCondition<P>
) => boolean;
export type Condition<P extends ParseSpec<P>> =
    | BuiltinCondition<P>
    | CustomCondition<P>;

export function simpleEquality<P extends ParseSpec<P>>(
    a: CustomCondition<P>,
    b: CustomCondition<P>
): boolean {
    if (a.type !== b.type) {
        return false;
    }
    if (a["value"] != b["value"]) {
        return false;
    }
    // This is written like so because it becomes easier to read
    return true;
}

export function areConditionsEqual<P extends ParseSpec<P>>(
    a: Condition<P>,
    b: Condition<P>,
    spec: P
): boolean {
    if (a.type !== b.type) {
        return false;
    }

    switch (a.type) {
        case "not":
            return areConditionsEqual(a["operand"], b["operand"], spec);
        case "and":
        case "or": {
            const aOps = a["operands"] as Array<Condition<P>>;
            const bOps = b["operands"] as Array<Condition<P>>;
            return arraysAreEqual(aOps, bOps, (a, b) =>
                areConditionsEqual(a, b, spec)
            );
        }
        default: {
            const aValue = a["value"],
                bValue = b["value"];
            const compare = spec[a.type].compare;
            if (typeof compare === "function") {
                return compare(aValue, bValue) === 0;
            } else {
                return aValue === bValue;
            }
        }
    }
}

/**
 * Calculates the "complexity" of a condition.
 * This function is useful for input validation as complex conditions may be more resource-intensive,
 * particularly when optimising them.
 *
 * @param condition The condition to calculate the complexity of.
 * @param custom A function that calculates the complexity of a custom condition. The default just returns 1 for everything.
 */
export function calculateComplexity<P extends ParseSpec<P>>(
    condition: Condition<P>,
    custom: (
        condition: CustomCondition<P>,
        calculateComplexity: (condition: Condition<P>) => number
    ) => number = () => 1
) {
    switch (condition.type) {
        case "not":
            return calculateComplexity(condition["operand"], custom) + 1;
        case "and":
        case "or": {
            const operands: Array<Condition<P>> = condition["operands"];
            return operands.reduce(
                (acc, con) => acc + calculateComplexity(con, custom),
                operands.length
            );
        }
        default:
            return custom(condition as CustomCondition<P>, (con) =>
                calculateComplexity(con, custom)
            );
    }
}

export { parse } from "./parse";

export function optimise<P extends ParseSpec<P>>(
    condition: Condition<P>,
    spec: P
): Condition<P> | null {
    switch (condition.type) {
        case "not": {
            const operand = condition["operand"];
            const inner = optimise(operand, spec);
            if (inner.type === "not") {
                return inner["operand"]; // Duplicate NOTs cancel out
            }

            condition["operand"] = inner;
            return condition;
        }
        case "and":
        case "or": {
            const operands = removeDuplicates(condition["operands"], spec);
            if (operands.length < 1) {
                return null;
            } else if (operands.length === 1) {
                // An AND or OR operator with only one operand is effectively a no-op

                return operands[0];
            } else {
                return {
                    type: condition.type,
                    operands
                } as BuiltinCondition<P>;
            }
        }
    }
    return condition;
}

function removeDuplicates<P extends ParseSpec<P>>(
    conditions: Array<Condition<P>>,
    spec: P
): Array<Condition<P>> {
    const filtered = [];
    for (const condition of conditions) {
        const optimised = optimise(condition, spec);
        if (optimised == null) continue;
        if (filtered.some((v) => areConditionsEqual(optimised, v, spec))) {
            continue;
        }
        filtered.push(optimised);
    }
    return filtered;
}

export * as values from "./values";
