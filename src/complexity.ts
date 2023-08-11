import type { Condition, ParseSpec } from "./spec";

export function complexityOf<T>(
    value: T,
    func: ((value: T) => number) | undefined
): number {
    if (func != undefined) {
        return func(value);
    } else {
        return 1;
    }
}

/**
 * Calculates the "complexity" of a condition.
 * This function is useful for input validation as complex conditions may be more resource-intensive,
 * particularly when optimising them.
 *
 * @param condition The condition to calculate the complexity of.
 * @param spec The parse specification.
 */
export function calculateComplexity<S extends ParseSpec<S>>(
    condition: Condition<S>,
    spec: S
) {
    switch (condition.type) {
        case "not":
            return calculateComplexity(condition["operand"], spec) + 1;
        case "and":
        case "or": {
            const operands: Array<Condition<S>> = condition["operands"];
            return operands.reduce(
                (acc, con) => acc + calculateComplexity(con, spec),
                operands.length
            );
        }
        default: {
            const complexity = spec[condition.type].complexity;
            return complexityOf(condition["value"], complexity);
        }
    }
}
