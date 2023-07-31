import { parse, values } from ".."; // In your code, import "querio" and not ".."

const spec = {
    user: values.string,
    type: values.string
};

parse("user:tecc type:profile", spec);
