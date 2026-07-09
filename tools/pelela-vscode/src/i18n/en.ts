import type { TranslationSchema } from './translationSchema'

const diagnostics = {
  viewModelNotFound: "ViewModel '{{name}}' not found in the TypeScript file",
  propertyNotFound: "Property '{{name}}' does not exist in the ViewModel",
  methodNotFound: "Method '{{name}}' does not exist in the ViewModel",
  unknownAttribute: "Unknown attribute: '{{name}}'",
  attributeNotAllowed: "Attribute '{{name}}' is not allowed on element '{{tag}}'",
} as const satisfies TranslationSchema['diagnostics']

export const en = {
  diagnostics,
} as const satisfies TranslationSchema
