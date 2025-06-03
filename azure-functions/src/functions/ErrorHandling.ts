/**
 * A function to replace Error objects with JS objects containing their properties.
 * @param key
 * @param value
 * @returns
 */
function errorReplacer(key: string, value: any) {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }
    return value;
}

/**
 * A function to print an error in a structured format.
 * @param error An object or a string.
 * @returns
 */
export function printError(error: any): string {
  return JSON.stringify(error, errorReplacer);
}
