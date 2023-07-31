import { describe, expect, it } from "@jest/globals";
import type { Condition } from "./index";
import { optimise, parse, values } from "./index";
import { tokenize } from "./parse";

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

    it("not as condition type", () => {
        expect(parse("not:a:value b c d:1", spec)).toEqual({
            type: "and",
            operands: [
                {
                    type: "not",
                    operand: {
                        // Well it is technically a value
                        type: "a",
                        value: "value"
                    }
                },
                { type: "b" },
                { type: "c" },
                { type: "d", value: 1 }
            ]
        });
    });

    describe("invalid queries", () => {
        it("no condition type", () => {
            expect(() => parse(":i :am :untyped", spec)).toThrowError(
                "':i': Condition does not have a type"
            );
        });
        it("reserved condition type ('and', 'or')", () => {
            expect(() => parse("and:then we feast", spec)).toThrowError(
                "'and:then': Reserved type 'and' used"
            );
        });
    });
});
describe("optimising", () => {
    it("double-negation", () => {
        const inner: Cond = {
            type: "a",
            value: "something"
        };
        expect(
            optimise(
                {
                    type: "not",
                    operand: {
                        type: "not",
                        operand: inner
                    }
                },
                spec
            )
        ).toEqual(inner);

        expect(
            optimise(
                {
                    type: "not",
                    operand: {
                        type: "not",
                        operand: {
                            type: "not",
                            operand: inner
                        }
                    }
                },
                spec
            )
        ).toEqual({
            type: "not",
            operand: inner
        });
    });
    describe("ORs/ANDs", () => {
        for (const op of ["and", "or"] as const) {
            it(`${op}: no elements should be null`, () => {
                const empty: Cond = {
                    type: op,
                    operands: []
                };
                expect(optimise(empty, spec)).toBeNull();
                expect(
                    optimise(
                        {
                            type: op,
                            operands: [empty]
                        },
                        spec
                    )
                ).toBeNull();
                expect(
                    optimise(
                        {
                            type: op,
                            operands: [empty, empty]
                        },
                        spec
                    )
                ).toBeNull();
            });
            it(`${op}: one element should be unwrapped`, () => {
                const single: Cond = {
                    type: "a",
                    value: "something"
                };
                expect(
                    optimise(
                        {
                            type: op,
                            operands: [single]
                        },
                        spec
                    )
                ).toEqual(single);
                expect(
                    optimise(
                        {
                            type: op,
                            operands: [
                                {
                                    type: op,
                                    operands: [single]
                                }
                            ]
                        },
                        spec
                    )
                ).toEqual(single);
            });
            it(`${op}: more than one element should stay the same`, () => {
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
                expect(optimise(original, spec)).toEqual(original);
            });
            it(`${op}: duplicate elements should be removed`, () => {
                expect(
                    optimise(
                        {
                            type: op,
                            operands: [
                                {
                                    type: "a",
                                    value: "something"
                                },
                                {
                                    type: "b"
                                },
                                {
                                    type: "a",
                                    value: "something"
                                }
                            ]
                        },
                        spec
                    )
                ).toEqual({
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
                });
            });
        }
    });
});

describe("complexity calculation", () => {});
