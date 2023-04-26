import { fieldKeys, Meta$, MetaFn } from "metaliq"
import { html } from "lit"
import { classMap } from "lit/directives/class-map.js"
import { getNavSelection, goNavRoute, toggleMenu } from "@metaliq/navigation"
import { MetaView, ViewResult } from "@metaliq/presentation"
import { VALIDATION } from "@metaliq/validation"
import { TERMINOLOGY } from "@metaliq/terminology"
import { APPLICATION } from "@metaliq/application"

VALIDATION()
TERMINOLOGY()
APPLICATION()

export type NavigationOptions = {
  logoUrl?: string
  logoUpdate?: MetaFn<any>
}

const hasOwnView: MetaFn<any> = (v, $) => !!$.raw("view")

export const navigator = (options: NavigationOptions = {}): MetaView<any> => (v, $) => html`
  <div class="mq-article">
    ${getNavSelection($, { mustHave: hasOwnView })?.view()}
  </div>
  <header>
    <div class="header-content">
      <img src=${options.logoUrl} alt="Logo" @click=${$.up(options.logoUpdate)}>
      <i class="bi bi-list" @click=${$.up(toggleMenu)}></i>
      <nav class=${classMap({ "mq-show": $.state.nav?.showMenu })}>
        ${menuItems($)}
      </nav>
    </div>
  </header>
`

const menuItems = ($: Meta$<any>, level: number = 0) => {
  const keys = fieldKeys($?.model)
    .filter(key => {
      const item = $.child$(key)
      return !item.term("hidden") && (item.term("label") || item.term("symbol"))
    })
  if (keys.length) {
    const selected$ = getNavSelection($)
    return html`
      <ul class=${`mq-level-${level}`}>
        ${keys.map(key => menuItem($.child$(key), selected$, level))}
      </ul>
    `
  } else return ""
}

const menuItem = (navItem$: Meta$<any>, selected$: Meta$<any>, level: number = 1): ViewResult => {
  const text = navItem$.term("label")
  const icon = navItem$.term("symbol")
  return html`
    <li @click=${navItem$.up(goNavRoute)} class=${classMap({
      "mq-selected": navItem$ === selected$
    })}>
      ${icon ? html`<i class=${icon}>` : ""}
      ${text ? html`<span>${text}</span>` : ""}
      ${menuItems(navItem$, level + 1)}
    </li>
  `
}
