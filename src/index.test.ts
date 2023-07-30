import { describe, expect, it } from "@jest/globals";
import type { BuiltinCondition, Condition } from "./index";
import { optimise, parse, values } from "./index";

const spec = {
    a: {
        parse: values.string
    },
    b: {},
    c: {},
    d: {
        parse: values.int
    },
    e: {}
};

type Spec = typeof spec;
type Cond = Condition<Spec>;

describe("parsing", () => {
    it("simple top-level query", () => {
        expect(parse("a:value b c d:24 e", spec)).toEqual({
            type: "and",
            operands: [
                {
                    type: "a",
                    value: "value"
                },
                {
                    type: "b"
                },
                {
                    type: "c"
                },
                {
                    type: "d",
                    value: 24
                },
                {
                    type: "e"
                }
            ]
        } satisfies Cond);
    });

    it("top-level OR", () => {
        expect(parse("a:value b | c d:24 e", spec)).toEqual({
            type: "or",
            operands: [
                {
                    type: "and",
                    operands: [
                        {
                            type: "a",
                            value: "value"
                        },
                        {
                            type: "b"
                        }
                    ]
                },
                {
                    type: "and",
                    operands: [
                        {
                            type: "c"
                        },
                        {
                            type: "d",
                            value: 24
                        },
                        {
                            type: "e"
                        }
                    ]
                }
            ]
        } satisfies Cond);
    });
});
describe("optimising", () => {
    it("double-negation", () => {
        const inner: Cond = {
            type: "a",
            value: "something"
        };
        expect(
            optimise({
                type: "not",
                operand: {
                    type: "not",
                    operand: inner
                }
            })
        ).toEqual(inner);

        expect(
            optimise<Spec>({
                type: "not",
                operand: {
                    type: "not",
                    operand: {
                        type: "not",
                        operand: inner
                    }
                }
            })
        ).toEqual({
            type: "not",
            operand: inner
        });
    });
    describe("ORs/ANDs operators with differently-sized elements", () => {
        for (const op of ["and", "or"] as const) {
            it(`${op}: with no elements`, () => {
                const empty: Cond = {
                    type: op,
                    operands: []
                };
                expect(optimise<Spec>(empty)).toBeNull();
                expect(
                    optimise<Spec>({
                        type: op,
                        operands: [empty]
                    })
                ).toBeNull();
                expect(
                    optimise<Spec>({
                        type: op,
                        operands: [empty, empty]
                    })
                ).toBeNull();
            });
            it(`${op}: with one element`, () => {
                const single: Cond = {
                    type: "a",
                    value: "something"
                };
                expect(
                    optimise<Spec>({
                        type: op,
                        operands: [single]
                    })
                ).toEqual(single);
                expect(
                    optimise<Spec>({
                        type: op,
                        operands: [
                            {
                                type: op,
                                operands: [single]
                            }
                        ]
                    })
                ).toEqual(single);
            });
            it(`${op}: with more than one element`, () => {
                const original: Cond = {
                    type: op,
                    operands: [
                        {
                            type: "a",
                            value: "something"
                        },
                        {
                            type: "b"
                        }
                    ]
                };
                expect(optimise<Spec>(original)).toEqual(original);
            });
        }
    });
});

describe("complexity calculation", () => {});
