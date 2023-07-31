import { describe, it, expect } from "@jest/globals";
import { tokenize, parse } from "./parse";
import type { Condition } from "./index";

describe("tokenizing", () => {
    describe("intended usage", () => {
        it("no parentheses", () => {
            expect(tokenize("a b c d e")).toEqual(["a", "b", "c", "d", "e"]);
        });
        it("double spaces in the middle", () => {
            expect(tokenize("a b c  d  e ")).toEqual(["a", "b", "c", "d", "e"]);
        });
        it("NOTs", () => {
            expect(tokenize("-a b c -d e")).toEqual([
                { type: "not", token: "a" },
                "b",
                "c",
                { type: "not", token: "d" },
                "e"
            ]);
        });
        it("groups", () => {
            expect(tokenize("a b ( c d ) e")).toEqual([
                "a",
                "b",
                { type: "group", tokens: ["c", "d"] },
                "e"
            ]);

            expect(tokenize("( )")).toEqual([]);
        });
        it("NOTed groups", () => {
            expect(tokenize("-( a b ) c d e")).toEqual([
                { type: "not", token: { type: "group", tokens: ["a", "b"] } },
                "c",
                "d",
                "e"
            ]);
        });

        it("top-level ORs", () => {
            expect(tokenize("a | b | c d")).toEqual([
                {
                    type: "or",
                    tokens: ["a", "b", { type: "group", tokens: ["c", "d"] }]
                }
            ]);
        });
        it("grouped ORs", () => {
            expect(tokenize("a ( b | c ) d")).toEqual([
                "a",
                { type: "or", tokens: ["b", "c"] },
                "d"
            ]);
        });
    });

    describe("incorrect usage", () => {
        it("blank string should return null", () => {
            expect(tokenize("")).toBeNull();
            expect(tokenize("    ")).toBeNull();
        });
        it("OR as first token", () => {
            expect(() => tokenize("| that shouldn't | be there")).toThrowError(
                "Was expecting a condition but got OR operator"
            );
        });
        it("OR as last token", () => {
            expect(() => tokenize("that shouldn't | be there |")).toThrowError(
                "Was expecting a condition but got emptiness"
            );
        });
        it("unmatched opening parenthesis", () => {
            expect(() =>
                tokenize("all your conditions ( are belong to me")
            ).toThrowError("Group begun but not ended");
        });
        it("unmatched ending parenthesis", () => {
            expect(() => {
                tokenize("let me out!!! )");
            }).toThrowError("Group ended but not begun");
        });
    });
});
