import { compareNumbers, compareStrings } from "../util";
import { noBadValues, parseIntSafe, wrap } from "./base";
import { binaryOperator } from "./binaryOp";

export const string = wrap({
    parse: (value) => value as string,
    compare: compareStrings
});

export const int = wrap({
    parse: parseIntSafe,
    compare: compareNumbers
});
export const float = wrap({
    parse: noBadValues(parseFloat),
    compare: compareNumbers
});

export const intWithBinaryOp = binaryOperator<number>(
    int,
    (value, diff) => value + diff
);
export const floatWithBinaryOp = binaryOperator<number>(float);
