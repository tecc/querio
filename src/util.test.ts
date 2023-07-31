import { describe, it, expect } from "@jest/globals";
import { arraysAreEqual } from "./util";

describe("arraysAreEqual", () => {
    it("same object", () => {
        const array = [1, 2, 3];
        expect(arraysAreEqual(array, array)).toBeTruthy();
    });
    it("same elements and ordering", () => {
        expect(arraysAreEqual([1, 2, 3], [1, 2, 3])).toBeTruthy();
    });
    it("same elements", () => {
        expect(arraysAreEqual([1, 2, 3], [3, 2, 1])).toBeTruthy();
    });

    it("arrays of different lengths", () => {
        expect(arraysAreEqual([1, 2, 3], [1, 2])).toBeFalsy();
    });
    it("arrays with duplicate elements", () => {
        expect(arraysAreEqual([1, 2, 3, 2], [2, 3, 1, 3])).toBeFalsy();
    });
});
