/** Exhaustiveness guard: makes the compiler reject unhandled union members. */
export function assertNever(value: never): never {
  throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
}
