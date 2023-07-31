import { describe, expect, it } from "@jest/globals";
import { optimise } from "./optimise";
import type { Cond } from "./testUtils";
import { spec } from "./testUtils";

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
