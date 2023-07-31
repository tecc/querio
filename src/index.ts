import type { Condition, CustomCondition, ParseSpec } from "./spec";

export * from "./spec";

/**
 * Calculates the "complexity" of a condition.
 * This function is useful for input validation as complex conditions may be more resource-intensive,
 * particularly when optimising them.
 *
 * @param condition The condition to calculate the complexity of.
 * @param custom A function that calculates the complexity of a custom condition. The default just returns 1 for everything.
 */
export function calculateComplexity<S extends ParseSpec<S>>(
    condition: Condition<S>,
    custom: (
        condition: CustomCondition<S>,
        calculateComplexity: (condition: Condition<S>) => number
    ) => number = () => 1
) {
    switch (condition.type) {
        case "not":
            return calculateComplexity(condition["operand"], custom) + 1;
        case "and":
        case "or": {
            const operands: Array<Condition<S>> = condition["operands"];
            return operands.reduce(
                (acc, con) => acc + calculateComplexity(con, custom),
                operands.length
            );
        }
        default:
            return custom(condition as CustomCondition<S>, (con) =>
                calculateComplexity(con, custom)
            );
    }
}

export { parse } from "./parse";
export { optimise } from "./optimise";

export * as values from "./values";
