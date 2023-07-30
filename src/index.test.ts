import { describe, expect, it } from "@jest/globals";
import type { Condition } from "./index";
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

describe("parsing", () => {
    it("simple top-level query", () => {
        const result = parse("a:value b c d:24 e", spec);
        expect(result).toEqual({
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
        } satisfies Condition<Spec>);
    });

    it("top-level OR", () => {
        const result = parse("a:value b | c d:24 e", spec);
        expect(result).toEqual({
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
        } satisfies Condition<Spec>);
    });
});
describe("optimising", () => {
    it("double-negation", () => {
        const inner = {
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
            optimise({
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
});

describe("complexity calculation", () => {});
