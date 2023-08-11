import { describe, expect, it } from "@jest/globals";
import {
    arraysAreEqual,
    compareConditions,
    compareNumbers,
    isNullOrBlank
} from "./util";
import { faker } from "@faker-js/faker";
import type { Cond } from "./testUtils";
import { iterations, randomArray, spec } from "./testUtils";
import { BinaryOperator, ReducedBinaryOperator } from "./values";

describe("arraysAreEqual", () => {
    it("same object", () => {
        iterations(() => {
            const array = randomArray(faker.number.int);
            expect(arraysAreEqual(array, array)).toBeTruthy();
        });
    });
    it("same elements and ordering", () => {
        iterations(() => {
            const original = randomArray(faker.number.int);
            expect(arraysAreEqual(original, [...original])).toBeTruthy();
        });
    });
    it("same elements", () => {
        iterations(() => {
            const original = randomArray(faker.number.int);
            const shuffled = faker.helpers.shuffle(original);
            expect(arraysAreEqual(original, shuffled)).toBeTruthy();
        });
    });

    it("arrays of different lengths", () => {
        iterations(() => {
            const a = randomArray(
                faker.number.int,
                faker.number.int({ min: 1, max: 16 })
            );
            const b = faker.helpers.arrayElements(a, a.length - 1);
            expect(arraysAreEqual(a, b)).toBeFalsy();
        });
    });
    it("arrays of same length but different elements", () => {
        iterations(() => {
            const a = randomArray(
                faker.number.int,
                faker.number.int({ min: 1, max: 16 })
            );
            const b = faker.helpers.shuffle(a);
            b[0] = b[0] + 1;
            expect(arraysAreEqual(a, b)).toBeFalsy();
        });
    });
});

function cmpConditions(lower: Cond, higher: Cond) {
    expect(compareConditions(lower, lower, spec)).toEqual(0);
    expect(compareConditions(lower, higher, spec)).toEqual(-1);
    expect(compareConditions(higher, lower, spec)).toEqual(1);
    expect(compareConditions(higher, higher, spec)).toEqual(0);
}

describe("comparisons", () => {
    it("numbers", () => {
        for (let i = 1; i < 100; i++) {
            expect(compareNumbers(i, i)).toEqual(0);
            expect(compareNumbers(i, -i)).toEqual(1);
            expect(compareNumbers(-i, i)).toEqual(-1);
        }
    });
    it("top-level equality", () => {
        iterations(() => {
            const cond = {
                type: "a",
                value: faker.string.alphanumeric()
            } satisfies Cond;
            expect(compareConditions(cond, cond, spec)).toEqual(0);
            expect(compareConditions(cond, { ...cond }, spec)).toEqual(0);
        });
    });
    it("nested equality", () => {
        iterations(() => {
            const cond = {
                type: "a",
                value: faker.string.alpha()
            } satisfies Cond;
            const and = {
                type: "and",
                operands: [cond]
            } satisfies Cond;
            const or = {
                type: "or",
                operands: [cond]
            } satisfies Cond;
            const not = {
                type: "not",
                operand: cond
            } satisfies Cond;
            for (const builtin of [and, or, not]) {
                expect(compareConditions(builtin, builtin, spec)).toEqual(0);
                expect(
                    compareConditions(builtin, { ...builtin }, spec)
                ).toEqual(0);
            }
        });
    });
    it("builtins are 'greater'", () => {
        iterations(() => {
            const cond = {
                type: "a",
                value: faker.string.alpha()
            } satisfies Cond;
            const and = {
                type: "and",
                operands: [cond]
            } satisfies Cond;
            const or = {
                type: "or",
                operands: [cond]
            } satisfies Cond;
            const not = {
                type: "not",
                operand: cond
            } satisfies Cond;
            for (const builtin of [and, or, not]) {
                expect(compareConditions(builtin, cond, spec)).toEqual(1);
                expect(compareConditions(cond, builtin, spec)).toEqual(-1);
            }
        });
    });
    describe("binary operator conditions", () => {
        it("specially reduced", () => {
            iterations(() => {
                const lessThan = {
                    type: "intB",
                    value: {
                        operator: BinaryOperator.LessThan,
                        value: faker.number.int()
                    }
                } satisfies Cond;
                const greaterThan = {
                    type: "intB",
                    value: {
                        operator: BinaryOperator.GreaterThan,
                        value: faker.number.int()
                    }
                } satisfies Cond;

                cmpConditions(lessThan, greaterThan);
            });
        });
        it("normally reduced", () => {
            function variants(operator: ReducedBinaryOperator) {
                const value = {
                    operator: operator,
                    value: faker.number.float(),
                    not: false
                };
                const reduced = { ...value, not: true };

                return [
                    {
                        type: "floatBR",
                        value: value
                    },
                    {
                        type: "floatBR",
                        value: reduced
                    }
                ] as const;
            }

            iterations(() => {
                const [lessThan, lessThanReduction] = variants(
                    ReducedBinaryOperator.LessThan
                );
                const [greaterThan, greaterThanReduction] = variants(
                    ReducedBinaryOperator.GreaterThan
                );

                cmpConditions(lessThan, greaterThan);
                cmpConditions(lessThanReduction, greaterThanReduction);
                cmpConditions(lessThan, lessThanReduction);
                cmpConditions(greaterThan, greaterThanReduction);
            });
        });
    });

    describe("multi-operand conditions", () => {
        // TODO: Testing inner comparisons (comparing two ands with same-length conditions)

        it("more conditions are 'greater'", () => {
            iterations(() => {
                const full = [
                    {
                        type: "a",
                        value: faker.string.alphanumeric()
                    } satisfies Cond,
                    {
                        type: "d",
                        value: faker.number.int()
                    } satisfies Cond,
                    {
                        type: "int",
                        value: faker.number.int()
                    } satisfies Cond,
                    {
                        type: "float",
                        value: faker.number.float()
                    } satisfies Cond
                ];
                const greaterSubset = faker.helpers.arrayElements(full, {
                    min: 1,
                    max: Infinity
                });
                const lesserSubset = faker.helpers.arrayElements(
                    greaterSubset,
                    {
                        min: 0,
                        max: greaterSubset.length - 1
                    }
                );

                const greaterAnd = {
                    type: "and",
                    operands: greaterSubset
                } satisfies Cond;
                const lesserAnd = {
                    type: "and",
                    operands: lesserSubset
                } satisfies Cond;

                const greaterOr = {
                    type: "or",
                    operands: greaterSubset
                } satisfies Cond;
                const lesserOr = {
                    type: "or",
                    operands: lesserSubset
                } satisfies Cond;

                cmpConditions(lesserAnd, greaterAnd);
                cmpConditions(lesserOr, greaterOr);
            });
        });
    });
});

describe("others", () => {
    describe("isNullOrBlank", () => {
        it("null/blank strings return true", () => {
            expect(isNullOrBlank(null)).toBeTruthy();
            expect(isNullOrBlank(undefined)).toBeTruthy();
            expect(isNullOrBlank("")).toBeTruthy();
            expect(isNullOrBlank("            ")).toBeTruthy();
            expect(isNullOrBlank("\n  \n")).toBeTruthy();
        });
        it("non-blank strings return false", () => {
            expect(isNullOrBlank("no_whitespace")).toBeFalsy();
            expect(isNullOrBlank("ok now some whitespace")).toBeFalsy();
            expect(isNullOrBlank("                whitespace\n  ")).toBeFalsy();
        });
    });
});
