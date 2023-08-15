import { describe, expect, it } from "@jest/globals";
import * as values from "./values";
import { BinaryOperator, ReducedBinaryOperator } from "./values";
import { parse } from "./parse";
import { faker } from "@faker-js/faker";
import type { Condition } from "./spec";
import { iterations } from "./testUtils";

describe("simple values", () => {
    describe("strings", () => {
        it("normal usage", () => {
            const spec = { value: values.string };
            const spec2 = {
                value: { parse: values.string, compare: values.string.compare }
            };
            iterations(() => {
                const value = faker.string.alpha();
                expect(parse(`value:${value}`, spec)).toEqual({
                    type: "value",
                    value
                });
                expect(parse(`value:${value}`, spec2)).toEqual({
                    type: "value",
                    value
                });
            });
        });
    });
    describe("int", () => {
        it("normal usage", () => {
            const spec = { value: values.int };
            iterations(() => {
                const value = faker.number.int();
                expect(parse(`value:${value}`, spec)).toEqual({
                    type: "value",
                    value
                });
            });
        });
        it("not-a-number is an error", () => {
            const spec = { value: values.int };
            iterations(() => {
                const value = faker.string.alpha();
                expect(() => parse(`value:${value}`, spec)).toThrowError(
                    `'value:${value}': Could not parse value: Error: Parsed value is NaN (not a number)`
                );
            });
        });
    });
    describe("float", () => {
        it("normal usage", () => {
            const spec = { value: values.float };
            iterations(() => {
                const value = faker.number.float();
                expect(parse(`value:${value}`, spec)).toEqual({
                    type: "value",
                    value
                });
            });
        });
    });
});

describe("binary operators", () => {
    const spec = { int: values.intWithBinaryOp };
    it("unspecified operator", () => {
        iterations(() => {
            const a = faker.number.int();
            expect(parse(`int:${a}`, spec)).toEqual({
                type: "int",
                value: {
                    value: a,
                    operator: BinaryOperator.EqualTo
                }
            } satisfies Condition<typeof spec>);
        });
    });
    it("explicit operator", () => {
        iterations(() => {
            const value = faker.number.int();
            const operator = faker.helpers.enumValue(BinaryOperator);
            // NOTE(tecc): For now this works;
            //             the string representation of each operator
            //             is also its representation in the query string.
            expect(parse(`int:${operator}${value}`, spec)).toEqual({
                type: "int",
                value: {
                    value: value,
                    operator: operator
                }
            } satisfies Condition<typeof spec>);
        });
    });
});

describe("reduced binary operators", () => {
    const REDUCTION_OPERATORS = [
        [
            BinaryOperator.GreaterThanOrEqualTo,
            ReducedBinaryOperator.GreaterThan,
            ReducedBinaryOperator.LessThan
        ] as const,
        [
            BinaryOperator.LessThanOrEqualTo,
            ReducedBinaryOperator.LessThan,
            ReducedBinaryOperator.GreaterThan
        ] as const
    ];

    const spec = {
        int: values.intWithBinaryOp.reduced,
        float: values.floatWithBinaryOp.reduced
    };
    it("unspecified operator", () => {
        iterations(() => {
            const a = faker.number.int();
            expect(parse(`int:${a}`, spec)).toEqual({
                type: "int",
                value: {
                    value: a,
                    operator: ReducedBinaryOperator.EqualTo
                }
            } satisfies Condition<typeof spec>);
        });
    });
    describe("special reduction (values.intWithBinaryOp.reduced)", () => {
        it("explicit operator", () => {
            iterations(() => {
                const value = faker.number.int();
                const operator = faker.helpers.enumValue(ReducedBinaryOperator);
                // NOTE(tecc): For now this works;
                //             the string representation of each operator
                //             is also its representation in the query string.
                expect(parse(`int:${operator}${value}`, spec)).toEqual({
                    type: "int",
                    value: {
                        value: value,
                        operator: operator
                    }
                } satisfies Condition<typeof spec>);
            });
        });
        it("operators that require reduction", () => {
            iterations(() => {
                const value = faker.number.int();
                const [written, reduced] =
                    faker.helpers.arrayElement(REDUCTION_OPERATORS);
                // NOTE(tecc): For now this works;
                //             the string representation of each operator
                //             is also its representation in the query string.
                expect(parse(`int:${written}${value}`, spec)).toEqual({
                    type: "int",
                    value: {
                        value:
                            value +
                            (written === BinaryOperator.LessThanOrEqualTo
                                ? 1
                                : -1),
                        operator: reduced
                    }
                } satisfies Condition<typeof spec>);
            });
        });
    });
    describe("default reduction (floatWithBinaryOp.reduced)", () => {
        it("explicit operator", () => {
            iterations(() => {
                const value = faker.number.float();
                const operator = faker.helpers.enumValue(ReducedBinaryOperator);
                // NOTE(tecc): For now this works;
                //             the string representation of each operator
                //             is also its representation in the query string.
                expect(parse(`float:${operator}${value}`, spec)).toEqual({
                    type: "float",
                    value: {
                        value: value,
                        operator: operator,
                        not: false
                    }
                } satisfies Condition<typeof spec>);
            });
        });
        it("operators that require reduction", () => {
            iterations(() => {
                const value = faker.number.float();
                const [written, , reduced] =
                    faker.helpers.arrayElement(REDUCTION_OPERATORS);
                // NOTE(tecc): For now this works;
                //             the string representation of each operator
                //             is also its representation in the query string.
                expect(parse(`float:${written}${value}`, spec)).toEqual({
                    type: "float",
                    value: {
                        value: value,
                        operator: reduced,
                        not: true
                    }
                } satisfies Condition<typeof spec>);
            });
        });
    });
});

describe("time", () => {
    const spec = {
        unix: values.unixTimestamp,
        ymd: values.utcDate
    };
    it("unix timestamps", () => {
        for (const timestamp of [Date.now(), 0]) {
            const date = new Date(timestamp);
            expect(parse(`unix:${date.getTime()}`, spec)).toEqual({
                type: "unix",
                value: date
            });
        }
    });
    it("UTC dates (year-month-day)", () => {
        for (const timestamp of [Date.now(), 0]) {
            const original = new Date(timestamp);
            const date = new Date(
                Date.UTC(
                    original.getUTCFullYear(),
                    original.getUTCMonth(),
                    original.getDay()
                )
            );
            expect(
                parse(
                    `ymd:${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`,
                    spec
                )
            ).toEqual({
                type: "ymd",
                value: date
            });
        }
    });
});
