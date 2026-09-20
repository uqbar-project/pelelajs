type DiagnosticsMessages = {
  viewModelMissingExport: string
  viewModelWrongCase: string
  viewModelNotFound: string
  viewModelNotAClassFunction: string
  viewModelNotAClassObject: string
  propertyNotFound: string
  methodNotFound: string
  methodNeedsGetter: string
  getterAsMethod: string
  propertyAsMethod: string
  arrowFunctionAsMethod: string
  arrowFunctionNotAllowed: string
  propertyCaseMismatch: string
  methodCaseMismatch: string
  unknownAttribute: string
  attributeNotAllowed: string
  invalidComponentAttribute: string
  constValueInvalid: string
  constValueExpectedNumber: string
  constValueExpectedBoolean: string
  constValueUnsupported: string
  childPropertyNotFound: string
  childPropertyCaseMismatch: string
  childPropertyReadOnly: string
  bindingTypeMismatch: string
  bindingKindNumber: string
  bindingKindString: string
  bindingKindBoolean: string
  bindingKindOther: string
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
  getterDetail: string
  iterationPropertyDetail: string
  nestedPropertyDetail: string
  childPropertyDetail: string
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
