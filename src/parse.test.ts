import { describe, expect, it } from "@jest/globals";
import { parse } from "./index";
import type { Cond } from "./testUtils";
import { spec } from "./testUtils";

describe("parsing", () => {
    it("empty query", () => {
        expect(parse("", spec)).toBeNull();
    });

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
        expect(parse("a:value -b", spec)).toEqual({
            type: "and",
            operands: [
                {
                    type: "a",
                    value: "value"
                },
                {
                    type: "not",
                    operand: {
                        type: "b"
                    }
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
        it("unknown condition type", () => {
            expect(() =>
                parse("some-condition:thatdoesn't exist", spec)
            ).toThrowError(
                "'some-condition:thatdoesn't': Unrecognised condition type 'some-condition'"
            );
        });
        it("condition with missing value", () => {
            expect(() => parse("a b", spec)).toThrowError(
                "'a': Condition type 'a' requires a value but one was not specified"
            );
        });

        it("int conditition with not-parsable value", () => {
            expect(() => parse("d:100 d:NaN", spec)).toThrowError(
                "'d:NaN': Could not parse value: Error: Parsed value is NaN (not a number)"
            );
        });
    });
});

describe("complexity calculation", () => {});
