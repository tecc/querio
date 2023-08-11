import { describe, it, expect } from "@jest/globals";
import { calculateComplexity } from "./complexity";
import type { Cond } from "./testUtils";
import { iterations, spec } from "./testUtils";
import { faker } from "@faker-js/faker";
import { BinaryOperator, ReducedBinaryOperator } from "./values";

describe("top-level conditions", () => {
    it("simple values", () => {
        iterations(() => {
            expect(
                calculateComplexity(
                    {
                        type: "a",
                        value: "value"
                    },
                    spec
                )
            ).toEqual(1);
        });
    });

    describe("binary ops", () => {
        it("ints", () => {
            iterations(() => {
                expect(
                    calculateComplexity(
                        {
                            type: "intB",
                            value: {
                                value: faker.number.int(),
                                operator:
                                    faker.helpers.enumValue(BinaryOperator)
                            }
                        },
                        spec
                    )
                ).toEqual(1);
            });
        });
        it("floats", () => {
            iterations(() => {
                expect(
                    calculateComplexity(
                        {
                            type: "floatB",
                            value: {
                                value: faker.number.float(),
                                operator:
                                    faker.helpers.enumValue(BinaryOperator)
                            }
                        },
                        spec
                    )
                ).toEqual(1);
            });
        });

        it("reduced-op ints", () => {
            iterations(() => {
                expect(
                    calculateComplexity(
                        {
                            type: "intBR",
                            value: {
                                value: faker.number.int(),
                                operator: faker.helpers.enumValue(
                                    ReducedBinaryOperator
                                )
                            }
                        },
                        spec
                    )
                ).toEqual(1);
            });
        });

        it("reduced-op floats", () => {
            iterations(() => {
                const not = faker.number.int() % 2 === 1;
                expect(
                    calculateComplexity(
                        {
                            type: "floatBR",
                            value: {
                                value: faker.number.float(),
                                operator: faker.helpers.enumValue(
                                    ReducedBinaryOperator
                                ),
                                not
                            }
                        },
                        spec
                    )
                ).toEqual(1 + (not ? 1 : 0));
            });
        });
    });
});

describe("nested conditions", () => {
    describe("NOTs", () => {
        it("simple conditions", () => {
            iterations(() => {
                const simples = [
                    {
                        type: "a",
                        value: faker.string.alphanumeric()
                    } satisfies Cond,
                    {
                        type: "int",
                        value: faker.number.int()
                    } satisfies Cond,
                    {
                        type: "float",
                        value: faker.number.float()
                    } satisfies Cond
                ] as const;

                for (const a of simples) {
                    expect(
                        calculateComplexity(
                            {
                                type: "not",
                                operand: a
                            },
                            spec
                        )
                    ).toEqual(2);
                }
            });
        });
        it("reduced ops", () => {
            iterations(() => {
                const not = faker.number.int() % 2 == 1;
                expect(
                    calculateComplexity(
                        {
                            type: "not",
                            operand: {
                                type: "floatBR",
                                value: {
                                    operator: faker.helpers.enumValue(
                                        ReducedBinaryOperator
                                    ),
                                    value: faker.number.float(),
                                    not
                                }
                            }
                        },
                        spec
                    )
                ).toEqual(2 + (not ? 1 : 0));
            });
        });
    });

    describe("ANDs/ORs", () => {
        it("simple values", () => {
            iterations(() => {
                const conds = [
                    {
                        type: "a",
                        value: faker.string.alphanumeric()
                    } satisfies Cond,
                    {
                        type: "int",
                        value: faker.number.int()
                    } satisfies Cond,
                    {
                        type: "float",
                        value: faker.number.float()
                    } satisfies Cond
                ] as const;

                // AND/OR conditions are considered to have a complexity equal to
                // the number of operands, plus the complexity of each individual operand.
                // In the case of simple operands such as these, they are equal to the number of operands times two.
                const subset = faker.helpers.arrayElements(conds);
                expect(
                    calculateComplexity(
                        {
                            type: "and",
                            operands: subset
                        },
                        spec
                    )
                ).toEqual(subset.length * 2);
                expect(
                    calculateComplexity(
                        {
                            type: "or",
                            operands: subset
                        },
                        spec
                    )
                ).toEqual(subset.length * 2);
            });
        });
    });
});
