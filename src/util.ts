import type { BuiltinCondition, Condition, ParseSpec } from "./spec";

export function arraysAreEqual<T>(
    a: Array<T>,
    b: Array<T>,
    comparison: (a: T, b: T) => boolean = (a, b) => a === b
): boolean {
    if (a === b) {
        // Might as well include this as an optimisation
        return true;
    }
    if (a.length !== b.length) {
        return false;
    }

    const bCopy = [...b];
    loopA: for (let i = 0; i < a.length; i++) {
        const elementA = a[i];
        for (let j = 0; j < bCopy.length; j++) {
            const elementB = bCopy[j];
            if (comparison(elementA, elementB)) {
                bCopy.splice(j, 1);
                continue loopA;
            }
        }
        return false;
    }
    return true;
}

export function isNullOrBlank(
    s: string | undefined | null
): s is undefined | null {
    if (s == null) return true;
    if (s.length < 1) return true;
    return s.match(/^\s+$/) != null;
}

export type CompareResult = 1 | 0 | -1;

export function numberToCompareResult(diff: number): CompareResult {
    if (diff === 0) {
        return 0;
    }
    return diff > 0 ? 1 : -1;
}

export function compareNumbers(a: number, b: number): CompareResult {
    if (a === b) {
        return 0;
    }
    return a > b ? 1 : -1;
}

export function compareStrings(a: string, b: string): CompareResult {
    return numberToCompareResult(a.localeCompare(b)) as CompareResult;
}

export function compareDates(a: Date, b: Date): CompareResult {
    return compareNumbers(a.getTime(), b.getTime());
}

export function isBuiltinConditionType(
    type: string
): type is BuiltinCondition<unknown>["type"] {
    switch (type) {
        case "and":
        case "or":
        case "not":
            return true;
        default:
            return false;
    }
}

export function compareConditions<P extends ParseSpec<P>>(
    a: Condition<P>,
    b: Condition<P>,
    spec: P
): CompareResult {
    if (a.type !== b.type) {
        const aIsBuiltin = isBuiltinConditionType(a.type);
        if (isBuiltinConditionType(b.type) !== aIsBuiltin) {
            return aIsBuiltin ? 1 : -1;
        }
        return compareStrings(a.type, b.type);
    }

    switch (a.type) {
        case "not":
            return compareConditions(a["operand"], b["operand"], spec);
        case "and":
        case "or": {
            const aOps = a["operands"] as Array<Condition<P>>;
            const bOps = b["operands"] as Array<Condition<P>>;
            if (
                arraysAreEqual(
                    aOps,
                    bOps,
                    (a, b) => compareConditions(a, b, spec) === 0
                )
            ) {
                return 0;
            }
            // Because the arrays aren't equal, at least one of them has an element
            const lengthComp = compareNumbers(aOps.length, bOps.length);
            if (lengthComp !== 0) {
                return lengthComp;
            }
            return compareConditions(aOps[0], bOps[0], spec);
        }
        default: {
            const aValue = a["value"],
                bValue = b["value"];
            const compare = spec[a.type].compare;
            if (typeof compare === "function") {
                return compare(aValue, bValue);
            } else {
                switch (typeof aValue) {
                    case "number":
                        return compareNumbers(aValue, bValue);
                    case "string":
                        return compareStrings(aValue, bValue);
                    default:
                        // For performance reasons this function does not compare deeper than this,
                        // and therefore returns 0
                        return 0;
                }
            }
        }
    }
}
