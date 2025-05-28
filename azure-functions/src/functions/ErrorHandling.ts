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

export function printError(error: any): string {
  return JSON.stringify(error, errorReplacer);
}
