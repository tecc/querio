import { compareDates, isNullOrBlank } from "../util";
import { parseIntSafe, wrap } from "./base";
import { binaryOperator } from "./binaryOp";

export const unixTimestamp = wrap({
    parse: (input) => new Date(parseIntSafe(input)),
    compare: compareDates
});

export const utcDate = wrap({
    parse: (input) => {
        const [year, month, day, ...remaining] = input.split("-");

        if (
            isNullOrBlank(year) ||
            isNullOrBlank(month) ||
            isNullOrBlank(day) ||
            remaining.length > 0
        ) {
            throw new Error("Invalid format: should be '<year>-<month>-<day>'");
        }

        return new Date(
            Date.UTC(parseIntSafe(year), parseIntSafe(month), parseIntSafe(day))
        );
    },
    compare: compareDates
});

export const unixTimestampWithBinaryOp = binaryOperator<Date>(unixTimestamp);
export const utcDateWithBinaryOp = binaryOperator<Date>(utcDate);
