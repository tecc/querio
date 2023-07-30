import type {
    BuiltinCondition,
    Condition,
    CustomCondition,
    ParseSpec
} from "./index";

type Token =
    | string
    | { type: "group"; tokens: Array<Token> }
    | { type: "not"; token: Token }
    | { type: "or"; tokens: Array<Token> };

function reduce(tokens: Array<Token>): Token {
    if (tokens.length < 1) {
        throw new Error("An operand must have at least 1 element");
    } else if (tokens.length === 1) {
        return tokens[0];
    } else {
        return { type: "group", tokens: tokens };
    }
}

// Consumed is the number of tokens consumed, excluding the target.
function captureUntil(
    raw: Array<string>,
    offset: number,
    target: string
): { consumed: number; tokens: Array<Token>; foundTarget: boolean } {
    const tokens = [];
    let foundTarget = false;
    let consumed = 0;
    for (let i = offset; i < raw.length; i++, consumed++) {
        const rawPart = raw[i];
        if (rawPart.trim().length < 1) {
            continue;
        }

        if (rawPart === target) {
            foundTarget = true;
            break;
        }

        let parsablePart: string,
            wrapWithNot = false;
        if (rawPart.charAt(0) === "-") {
            parsablePart = rawPart.substring(1);
            wrapWithNot = true;
        } else {
            parsablePart = rawPart;
        }

        let token: Token;
        if (parsablePart === "(") {
            const group = captureUntil(raw, i + 1, ")");
            if (!group.foundTarget)
                throw new Error("Group began but not ended");
            i += group.consumed + 1;
            // Maybe use reduce here?
            token =
                group.tokens.length === 1
                    ? group.tokens[0]
                    : {
                          type: "group",
                          tokens: group.tokens
                      };
        } else {
            token = parsablePart;
        }

        tokens.push(wrapWithNot ? { type: "not", token } : token);
    }

    const or: Array<Token> = [];
    let expectingAnything = true;
    let current = [];
    for (const token of tokens) {
        if (token === "|") {
            if (expectingAnything) {
                throw new Error(
                    "Was expecting a condition but got OR operator"
                );
            }
            expectingAnything = true;
            or.push(reduce(current));
            current = [];
            continue;
        }
        current.push(token);
        expectingAnything = false;
    }
    if (expectingAnything) {
        throw new Error("Was expecting a condition but got emptiness");
    }
    if (current.length > 0) {
        or.push(reduce(current));
    }
    if (or.length > 1) {
        return { consumed, foundTarget, tokens: [{ type: "or", tokens: or }] };
    }

    return { consumed, tokens, foundTarget };
}

export function tokenize(query: string): Array<Token> | null {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
        return null;
    }

    // TODO: Support quoting
    const result = captureUntil(trimmed.split(" "), 0, ""); // will guarantee it never fails

    if (result.foundTarget) {
        throw new Error(
            "captureUntil reached the empty target, which shouldn't be possible"
        );
    }

    return result.tokens;
}

export function parseCondition<P extends ParseSpec<P>>(
    condition: string,
    spec: P
): Condition<P> {
    const [type, value] = condition.split(":", 2);
    if (type == null) {
        throw new Error(`'${condition}': Condition does not have a type`);
    }

    switch (type) {
        case "not":
            return { type: "not", operand: parseCondition(value, spec) };
        case "and":
        case "or":
            throw new Error(`'${condition}': Reserved type '${type}' used`);
        default: {
            if (spec[type] == null) {
                throw new Error(
                    `'${condition}': Unrecognised condition type '${type}'`
                );
            }
            const typeKey = type as keyof P;
            const conditionSpec = spec[typeKey];

            if (typeof conditionSpec.parse === "function") {
                if (value == null) {
                    throw new Error(
                        `'${condition}': Condition does not have a value`
                    );
                }
                let parsed;
                try {
                    parsed = conditionSpec.parse(value);
                } catch (e) {
                    throw new Error(
                        `'${condition}': Could not parse value: ${e}`
                    );
                }
                return {
                    type: typeKey,
                    value: parsed
                } as unknown as CustomCondition<P>;
            } else {
                return { type: typeKey } as CustomCondition<P>;
            }
        }
    }
}

function translate<P extends ParseSpec<P>>(
    token: Token,
    spec: P
): Condition<P> {
    if (typeof token === "string") {
        return parseCondition(token, spec);
    }

    switch (token.type) {
        case "group":
        case "or":
            return {
                type: token.type === "group" ? "and" : "or",
                operands: token.tokens.map((v) => translate(v, spec))
            } as BuiltinCondition<P>;
        case "not":
            return {
                type: "not",
                operand: translate(token.token, spec)
            } as BuiltinCondition<P>;
    }

    throw new Error("Unrecognised token");
}

export function parse<P extends ParseSpec<P>>(
    query: string,
    spec: P
): Condition<P> | null {
    const tokens = tokenize(query);
    if (tokens == null) {
        return null;
    }

    return translate(reduce(tokens), spec);
}
