import { Meta$, MetaFn } from "metaliq"

/**
 * Policy registration.
 */
export const TERMINOLOGY = () => {}

export interface TerminologyTerms<T, P = any> {
  /**
   * Primary identifying label.
   */
  label?: string | MetaFn<T, P, string>

  /**
   * Additional descriptive text.
   */
  helpText?: string | MetaFn<T, P, string>

  /**
   * Symbolic indicator (such as an icon class).
   */
  symbol?: string | MetaFn<T, P, string>
}

declare module "metaliq" {
  namespace Policy {
    interface Terms<T, P> extends TerminologyTerms<T, P> {}
  }
}

/**
 * Return a full path string for the given meta within it's given ancestor.
 */
export function labelPath (from: Meta$<any>, to: Meta$<any>) {
  const labels = [labelOrKey(to)]
  while (to.parent$ && to.parent$ !== from) {
    to = to.parent$
    const toLabel = labelOrKey(to)
    if (toLabel) labels.unshift(toLabel)
  }
  return labels.join(" > ")
}

/**
 * Return the field's label, or key if none.
 * Can accept the meta info $ object (recommended)
 * or its associated data value (not a primitive).
 */
export const labelOrKey: MetaFn<any> = $ => {
  return $.term("label") ?? $.key
}
