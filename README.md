# Querio: Condition-based query parser

> Note: This is not a URL query string parser. For that, try [qs](https://www.npmjs.com/package/qs).

This README is not finished and may contain some inaccuracies. 
Look through the test code if you'd like to see how to use and not to use Querio.

## Usage

### Parse specifications

To use Querio, you must first create a _parse specification_. These specifications dictate *how* Querio should parse the
query strings.

A parse specification is essentially a key-value pair of strings (_condition type_) to _condition specifications_.
Consider the following (it's "inspired" by repository issues):

```ts
import { values } from "querio";

const spec = {
    author: values.string,
    issue: values.int
};
```

This specification would tell Querio that the condition type `author` is to be interpreted as a string.
`values.string` is just a predefined condition specification for strings.
You can have as many condition types as you want, as long as their names don't conflict.

Given this specification, you would parse query strings using the `parse` function:

```ts
import { parse } from "querio";

// OK: The username must be equal to "tecc"
parse("author:tecc", spec);

// OK: The username must be equal to "tecc", and the issue ID has to be equal to 123
parse("author:tecc issue:123", spec);

// ERROR: NotANumber isn't a valid integer, so this will throw.
parse("author:tecc issue:NotANumber", spec);

// ERROR: name isn't a known condition type, so this will throw.
parse("name:tecc", spec);
```

### Condition types

As previously mentioned, a parse specification consists of multiple condition types.
These condition types consist of the type's name, and its specification.

You can have as many condition types as you want, as long as none of them have conflicting names.
There is also one restriction on what names you can use for the parse specification:
you *cannot* use the names `and`, `or`, and `not`.

If the example from the previous section were to be expanded, it would look something like this:

```ts
const spec = {
    author: {
        parse: (input) => input,
        compare: /* omitted for brevity */
    },
    issue: {
        parse: (input) => parseInt(input),
        compare: /* also omitted */
    }
};
```

A condition specification specifies how Querio should handle each condition type. They are structured like so:

```ts
type ValueType = /* Something */;
const conditionSpecification = {
    parse: (input: string): ValueType => {
        // This function parses the input string to its value type.
    }
}
```

Condition specifications can also be "empty", meaning they do not have a value.
In this case, they act like flags.

### Complex conditions

The already-provided functionality is fine and all, but what if you want more complex queries?
What if you want any issue that was authored by `tecc` _or_ has the ID `123`? What about those _not_ authored
by `johndoe`? Well, Querio supports this out-of-the-box.

Addressing the first problem, using the `|` character between two or more conditions.
For example, `author:tecc | issue:123` would be interpreted as "the author must equal `tecc` OR the issue ID must equal `123`".

The second problem can be solved by prefixing any condition with a `-` sign: `-author:johndoe`.

Another very powerful feature are _groups_: by encasing conditions in parentheses, that group is treated as "one condition".
For example, `( author:tecc issue:123 ) | author:johndoe` would be interpreted as "( the author must equal `tecc` AND the ID must equal 123 ) OR the author must equal `johndoe`".

Groups can also be prefixed with a `-` to negate them: `-( author:tecc issue:123 )`.

## Explanation

Well, I needed something that could parse a string into some format well-suited for converting directly to database
queries. Querio was made to fill that purpose in a generic way.

The primary inspiration in its initial design phase was the [arg](https://www.npmjs.com/package/arg) package.
