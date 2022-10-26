import * as ChoicesModule from "choices.js"
import { MetaView } from "@metaliq/presentation"
import { html } from "lit"
import { guard } from "lit/directives/guard.js"
import { classMap } from "lit/directives/class-map.js"
import { up } from "@metaliq/up"
import { Meta$, MetaFn } from "metaliq"
import { fieldClasses, fieldError, fieldLabel, isDisabled } from "@metaliq/forms"
import { getModuleDefault } from "@metaliq/util/lib/import"
import { equals, remove } from "@metaliq/util"
import { hasValue, validate } from "@metaliq/validation"

export { Choice } from "choices.js"

/**
 * Can't get proper type references from library due to incorrect ES definitions.
 * Mimic here.
 */
type ChoicesJs = {
  setChoices: (p: any[], v?: string, l?: string, r?: boolean) => void
  setChoiceByValue: (v: string) => void
  clearChoices: () => void
  clearStore: () => void
}

export type SelectorOptions<T, P = any> = {
  classes?: string
  type?: "text" | "select-one" | "select-multiple"

  /**
   * Either a static array of choices or a function that returns choices.
   * This allows dynamic choices based on values elsewhere in the data graph.
   * If choices need to be dynamically updated on search key input, use
   * searchChoices instead. Using both together is not supported.
   */
  choices?: ChoicesModule.Choice[] | MetaFn<T, P, ChoicesModule.Choice[]>

  /**
   * A function (possibly asynchronous) that returns choices based on the
   * current value in the search input text.
   */
  searchFn?: SelectorSearchFn<P>

  searchText?: string
  multiple?: boolean
  sort?: boolean // Defaults to true, assign false to prevent alpha-sorting
}

export type SelectorSearchFn<P> = (
  searchText: string, parent$: Meta$<P>
) => ChoicesModule.Choice[] | Promise<ChoicesModule.Choice[]>

interface SelectorState {
  choices?: ChoicesModule.Choice[]
  choicesJs?: ChoicesJs
}

declare module "metaliq" {
  namespace Policy {
    interface State<T, P> extends SelectorState {
      this?: State<T, P>
    }
  }
}

const Choices = <any>getModuleDefault(ChoicesModule, "Choices") as typeof ChoicesModule.default

export const selector = <T, P>(options: SelectorOptions<T, P> = {}): MetaView<T, P> => (v, $) => {
  options = { sort: true, ...options }

  const resetChoices = (choicesJs: ChoicesJs = $.state.choicesJs) => {
    if (!choicesJs) return
    choicesJs.clearStore()
    choicesJs.setChoices($.state.choices, "value", "label", true)
  }

  const disabled = isDisabled($)

  if (typeof options.choices === "function") {
    const newChoices = options.choices(v, $) || []
    if (!equals(newChoices, $.state.choices)) {
      if ($.state.choices) $.value = null // There was previously a different initialised choice list
      $.state.choices = newChoices
      resetChoices()
    }
  } else if (Array.isArray(options.choices)) {
    $.state.choices = options.choices
  } else {
    $.state.choices = []
  }

  return html`
    <label class="mq-field mq-select-field ${classMap({
      [options.classes]: !!options.classes,
      ...fieldClasses($),
      "mq-populated": hasValue($)
    })}">
      ${guard($, () => {
        const id = `mq-selector-${Math.ceil(Math.random() * 1000000)}`
        $.state.choices.forEach(choice => { delete choice.selected })
        if (hasValue($)) {
          const values = Array.isArray(v) ? v : [v]
          for (const val of values) {
            const selected = $.state.choices.find(c => c.value === val)
            if (!selected) {
              console.warn(`Invalid selector value for ${$.key} : ${v}`)
            } else {
              selected.selected = true
            }
          }
        }
        setTimeout(
          () => {
            const el = document.querySelector(`#${id}`)
            // eslint-disable-next-line no-new -- No need to hold reference to Choices
            $.state.choicesJs = new Choices(el, {
              searchPlaceholderValue: options.searchText ?? "",
              allowHTML: true,
              removeItems: true,
              removeItemButton: true,
              shouldSort: !!options.sort,
              callbackOnInit: function () {
                resetChoices(<unknown> this as ChoicesJs)
              }
            })

            if (typeof options.searchFn === "function") {
              const asyncListener = async (e: any) => {
                // TODO: Debounce
                const searchText = e.detail.value
                $.state.choices = await options.searchFn(searchText, $.parent.$)
                resetChoices()
              }

              el.addEventListener("search", e => { asyncListener(e).catch(console.error) })
            }
          },
          250
        )

        return html`
            <select id=${id}
              @change=${up(onChange(options), $)}
              @addItem=${up(onAddItem(options), $)}
              @removeItem=${up(onRemoveItem(options), $)}
              ?multiple=${options.multiple}
              ?disabled=${disabled}
              class="mq-input ${classMap({ "mq-disabled": disabled })}"
            >
              ${options.multiple ? "" : html`
                <option value="">${$.state.label}</option>
              `}
            </select>
          `
      })}
      ${fieldLabel()(v, $ as Meta$<unknown, any>)}
      ${fieldError(v, $)}
    </label>
`
}

export const objectChoices = (object: object, keyAsLabel: boolean = false) => [
  ...Object.entries(object).map(([k, v]) => ({
    value: k,
    label: keyAsLabel ? k : v
  }))
]

export const stringChoices = (strings: string[]) => strings.map(s => ({ value: s, label: s }))

type ProposedChange = {
  type: "Add" | "Remove"
  value: string
}

const state = {
  proposedChange: null as ProposedChange
}

const onChange = (options: SelectorOptions<any>) => ($: Meta$<any>, event: Event) => {
  if (state.proposedChange?.type === "Add") {
    if (options.multiple) {
      $.value = $.value || []
      $.value.push(state.proposedChange.value)
    } else {
      $.value = state.proposedChange.value
    }
  } else if (state.proposedChange?.type === "Remove") {
    if (options.multiple) {
      remove($.value, state.proposedChange.value)
    } else {
      $.value = ""
    }
  }
  validate($)
  state.proposedChange = null
}

const onAddItem = (options: SelectorOptions<any>) => ($: Meta$<any>, event: { detail: { value: string } }) => {
  state.proposedChange = {
    type: "Add",
    value: event?.detail?.value
  }
}

const onRemoveItem = (options: SelectorOptions<any>) => ($: Meta$<any>, event: { detail: { value: string } }) => {
  state.proposedChange = {
    type: "Remove",
    value: event?.detail?.value
  }
}
