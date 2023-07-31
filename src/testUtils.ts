import type { Condition } from "./spec";
import { values } from "./index";
import { faker } from "@faker-js/faker";

export const spec = {
    a: values.string,
    b: {},
    c: {},
    d: values.int,
    e: {},
    intB: values.intWithBinaryOp,
    intBR: values.intWithBinaryOp.reduced,
    floatB: values.floatWithBinaryOp,
    floatBR: values.floatWithBinaryOp.reduced
};

export type Spec = typeof spec;
export type Cond = Condition<Spec>;

const ITERATIONS = 32;

export function iterations(
    f: (iteration: number) => void,
    iterations: number = ITERATIONS
) {
    for (let i = 0; i < iterations; i++) {
        f(i);
    }
}

export function randomArray<T>(
    fn: () => T,
    length = faker.number.int(16)
): Array<T> {
    const arr: Array<T> = Array(length);
    for (let i = 0; i < arr.length; i++) {
        arr[i] = fn();
    }
    return arr;
}
