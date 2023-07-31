export function arraysAreEqual<T>(
    a: Array<T>,
    b: Array<T>,
    comparison: (a: T, b: T) => boolean = (a, b) => a === b
): boolean {
    if (a === b) {
        // Might as well include this as an optimisation
        return true;
    }
    if (a.length !== b.length) {
        return false;
    }

    const bCopy = [...b];
    loopA: for (let i = 0; i < a.length; i++) {
        const elementA = a[i];
        for (let j = 0; j < bCopy.length; j++) {
            const elementB = bCopy[j];
            if (comparison(elementA, elementB)) {
                bCopy.splice(j, 1);
                continue loopA;
            }
        }
        return false;
    }
    return true;
}
