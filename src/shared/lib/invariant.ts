/** Throws when a condition that the code relies on does not hold. */
export function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invariant violation: ${message}`);
  }
}
