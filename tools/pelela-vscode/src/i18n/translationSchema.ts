type DiagnosticsMessages = {
  viewModelNotFound: string
  propertyNotFound: string
  methodNotFound: string
  unknownAttribute: string
  attributeNotAllowed: string
  invalidComponentAttribute: string
}

type CompletionMessages = {
  viewModelDetail: string
  clickDetail: string
  enterDetail: string
  ifDetail: string
  forEachDetail: string
  indexDetail: string
  bindDetail: string
  propDetail: string
  linkDetail: string
  constDetail: string
  methodDetail: string
  propertyDetail: string
  iterationPropertyDetail: string
  nestedPropertyDetail: string
}

type HoverMessages = {
  viewModelHelp: string
  clickHelp: string
  enterHelp: string
  ifHelp: string
  forEachHelp: string
  indexHelp: string
  bindAltHelp: string
  bindClassHelp: string
  bindContentHelp: string
  bindEnabledHelp: string
  bindSrcHelp: string
  bindStyleHelp: string
  bindValueHelp: string
  propHelp: string
  linkHelp: string
  constHelp: string
}

export type TranslationSchema = {
  diagnostics: DiagnosticsMessages
  completions: CompletionMessages
  hover: HoverMessages
}
