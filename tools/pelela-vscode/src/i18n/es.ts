import type { TranslationSchema } from './translationSchema'

const diagnostics = {
  viewModelNotFound: "ViewModel '{{name}}' no encontrado en el archivo TypeScript",
  propertyNotFound: "La propiedad '{{name}}' no existe en el ViewModel",
  methodNotFound: "El método '{{name}}' no existe en el ViewModel",
  unknownAttribute: "Atributo desconocido: '{{name}}'",
  attributeNotAllowed: "El atributo '{{name}}' no está permitido en elemento '{{tag}}'",
} as const satisfies TranslationSchema['diagnostics']

export const es = {
  diagnostics,
} as const satisfies TranslationSchema
