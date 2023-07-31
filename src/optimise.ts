import type { BuiltinCondition, Condition, ParseSpec } from "./spec";
import { compareConditions } from "./util";

export function optimise<S extends ParseSpec<S>>(
    condition: Condition<S>,
    spec: S
): Condition<S> | null {
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
                } as BuiltinCondition<S>;
            }
        }
    }
    return condition;
}

function removeDuplicates<S extends ParseSpec<S>>(
    conditions: Array<Condition<S>>,
    spec: S
): Array<Condition<S>> {
    const filtered = [];
    for (const condition of conditions) {
        const optimised = optimise(condition, spec);
        if (optimised == null) continue;
        if (filtered.some((v) => compareConditions(optimised, v, spec) === 0)) {
            continue;
        }
        filtered.push(optimised);
    }
    return filtered;
}
