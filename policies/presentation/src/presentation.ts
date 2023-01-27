import { render, TemplateResult } from "lit"
import { $fn, child$, FieldKey, FieldType, getDynamicTerm, MetaFn, metaSetups } from "metaliq"

export { PublicationTarget } from "@metaliq/publication"
export { ApplicationModel } from "@metaliq/application"
export { TerminologyModel } from "@metaliq/terminology"
export { ValidationModel } from "@metaliq/validation"

export interface PresentationModel<T, P> {
  /**
   * The primary view associated with this MetaModel.
   */
  view?: MetaViewTerm<T, P>

  /**
   * An auxiliary view, such as for a contextual control zone.
   */
  controlView?: MetaViewTerm<T, P>

  /**
   * An auxiliary view, such as for a contextual status zone.
   */
  statusView?: MetaViewTerm<T, P>
}

export interface PresentationState {
  active?: boolean
}

declare module "metaliq" {
  namespace Policy {
    interface Model<T, P> extends PresentationModel<T, P> { }
    interface State<T, P> extends PresentationState {
      this?: State<T, P>
    }
  }
}

/**
 * A view is a meta function for a data type that returns a view result for rendering.
 */
export type MetaView<T, P = any> = MetaFn<T, P, ViewResult>

/**
 * A view result can be either singular or plural
 * (in which case they are rendered in sequence).
 */
export type ViewResult = SingularViewResult | ViewResult[]

/**
 * An individual view result can be a simple string or a dynamic template.
 */
export type SingularViewResult = TemplateResult | string

/**
 * Term to specify meta views, can be either singular or plural
 * (in which case each view result (which themselves may be singular or plural) is rendered in sequence).
 */
export type MetaViewTerm<T, P = any> = MetaView<T, P> | Array<MetaView<T, P>>

metaSetups.push($ => {
  // Default the review method of the top level MetaModel to renderPage if not assigned and this policy has been loaded
  if (!$.parent) {
    // TODO: These should go into runtime target
    if ($.model.view || !$.model.publicationTarget) {
      $.model.review = $.model.review || renderPage
      Object.assign(window, { meta: $.meta })
      document.title = getDynamicTerm("label")($.value, $)
    }
  }
})

/**
 * A widget takes some configuration and returns a View.
 */
export type Widget<T, P = any> = (...params: any[]) => MetaView<T, P>

/**
 * The renderPage function, if specified as the review property from the app policy,
 * produces a global-state single page app.
 */
export const renderPage: MetaFn<any> = (value, meta) => {
  render(view()(value, meta), document.body)
}

/**
 * A view designed to accept and wrap another view.
 */
export type ViewWrapper = <T> (metaView: MetaView<T>) => MetaView<T>

/**
 * A wrapper for dynamic hide-show fields, to do animation for example.
 */
let hideShowWrapper: ViewWrapper = null
export function setHideShowWrapper (wrapper: ViewWrapper) {
  hideShowWrapper = wrapper
}

/**
 * Get a ViewResult for the given value and meta info.
 * If the view is not specified, will fall back to the MetaModel's view.
 * Calling `view(myView)(myValue, myMeta$?)` has several advantages over calling `myView(myValue, myMeta$)`:
 *
 * First, it can accommodate either a single view or an array of views - enabling the
 * view term of a meta to accomodate multiple views.
 * Second, it automatically handles dynamic hide / show.
 * Third, it returns a meta view that, if provided with only a value,
 * will attempt to deduce the meta info,
 * so the "inner" view function does not necessarily have to.
 * As with other meta functions, meta info deduction does not work for primitives
 * and may be unreliable where the same value object is shared by multiple meta-model objects.
 * Fourth, if both a value and meta info are provided,
 * the $ backlink on the value object will be re-established.
 * This can assist in situations where a single value object is being shared
 * (with possibly different MetaModels) across multiple points in the meta graph.
 *
 * ```
 * view()(myValue) // View myValue with the view from the model, if present
 * view(maybeView)(myValue) // View using maybeView if present, otherwise fall back to model view if present
 * view([firstView, secondView])(myValue) // View myValue using two different views sequentially
 * ```
 */
export function view <T, P = any> (
  metaViewTerm?: MetaViewTerm<T, P>
): MetaView<T, P> {
  return $fn((v, $) => {
    if (typeof (v ?? false) === "object") {
      // Establish correct value/meta link prior to viewing
      Object.assign(v, { $ })
    }
    metaViewTerm = metaViewTerm ?? $.model.view
    if (!metaViewTerm) {
      return ""
    } else if (Array.isArray(metaViewTerm)) {
      return metaViewTerm.map(mv => view(mv)(v, $))
    } else {
      if (typeof $.model.hidden === "function") {
        return hideShowWrapper(metaViewTerm)(v, $)
      } else {
        return $.state.hidden ? "" : metaViewTerm(v, $)
      }
    }
  })
}
