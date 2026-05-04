// Filter registry for the Web Harvester template engine.
//
// A filter is a pure function that transforms a string value. Filters are
// looked up by name and invoked through this registry from the template
// renderer. Unknown filter names pass the input value through unchanged so
// callers can compose filter chains defensively.

/**
 * Signature of a filter function: takes a string value plus zero or more
 * positional string arguments and returns the transformed string.
 */
export type FilterFn = (value: string, ...args: string[]) => string;

/**
 * Registry that stores named filter functions and applies them by name.
 * Implementations are responsible for handling unknown filter names — the
 * default contract is to return the input value unchanged.
 */
export interface IFilterRegistry {
  /** Register (or overwrite) a filter under the given name. */
  register(name: string, fn: FilterFn): void;
  /** Look up a previously registered filter, or `undefined` if none. */
  get(name: string): FilterFn | undefined;
  /** Apply a named filter to a value. Unknown names return value unchanged. */
  apply(name: string, value: string, args: string[]): string;
}

/**
 * Create a new, empty filter registry. Use `createPopulatedFilterRegistry`
 * (in `@domain/filters/index`) when the full pure-filter suite is needed.
 */
export function createFilterRegistry(): IFilterRegistry {
  const registry = new Map<string, FilterFn>();
  return {
    register(name: string, fn: FilterFn): void {
      registry.set(name, fn);
    },
    get(name: string): FilterFn | undefined {
      return registry.get(name);
    },
    apply(name: string, value: string, args: string[]): string {
      const fn = registry.get(name);
      if (!fn) return value;
      return fn(value, ...args);
    },
  };
}
