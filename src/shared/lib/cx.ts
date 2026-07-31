/** Joins class names, skipping falsy entries: cx(a, cond && b). */
export function cx(...classes: readonly (string | false | undefined)[]): string {
  return classes.filter((entry): entry is string => typeof entry === 'string').join(' ');
}
