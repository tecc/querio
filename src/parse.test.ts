import { describe, it, expect } from "@jest/globals";
import { tokenize, parse } from "./parse";
import type { Condition } from "./index";

describe("tokenizing", () => {
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
