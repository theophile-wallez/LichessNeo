/** `items` in an order drawn from `random`, the original untouched. */
export const shuffled = <T>(items: readonly T[], random: () => number): T[] =>
  items
    .map(item => ({ item, order: random() }))
    .toSorted((first, second) => first.order - second.order)
    .map(({ item }) => item);
