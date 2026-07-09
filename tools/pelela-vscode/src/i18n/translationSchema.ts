type DiagnosticsMessages = {
  viewModelNotFound: string
  propertyNotFound: string
  methodNotFound: string
  unknownAttribute: string
  attributeNotAllowed: string
}

export type TranslationSchema = {
  diagnostics: DiagnosticsMessages
}
