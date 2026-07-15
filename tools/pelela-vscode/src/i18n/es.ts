import type { TranslationSchema } from './translationSchema'

const diagnostics = {
  viewModelNotFound: "ViewModel '{{name}}' no encontrado en el archivo TypeScript",
  propertyNotFound: "La propiedad '{{name}}' no existe en el ViewModel",
  methodNotFound: "El método '{{name}}' no existe en el ViewModel",
  unknownAttribute: "Atributo desconocido: '{{name}}'",
  attributeNotAllowed: "El atributo '{{name}}' no está permitido en elemento '{{tag}}'",
  invalidComponentAttribute:
    "Componente '<{{tag}}>': el atributo '{{name}}' debe usar prefijo 'prop-', 'link-' o 'const-'",
} as const satisfies TranslationSchema['diagnostics']

const completions = {
  viewModelDetail: 'Pelela: view model asociado al template',
  clickDetail: 'Pelela: ejecuta un método del view model al hacer click',
  enterDetail: 'Pelela: ejecuta un método del view model al presionar Enter',
  ifDetail: 'Pelela: renderizado condicional',
  forEachDetail: 'Pelela: itera sobre una colección del view model',
  indexDetail: 'Pelela: nombre de la variable de índice en un for-each',
  bindDetail: 'Pelela: binding al view model',
  propDetail: 'Pelela: one-way binding para un componente hijo',
  linkDetail: 'Pelela: two-way binding para un componente hijo',
  constDetail: 'Pelela: valor constante para un componente',
  methodDetail: 'Método del ViewModel de Pelela',
  propertyDetail: 'Propiedad del ViewModel de Pelela',
  iterationPropertyDetail: 'Propiedad de iteración de Pelela',
  nestedPropertyDetail: 'Propiedad anidada del ViewModel de Pelela',
} as const satisfies TranslationSchema['completions']

const hover = {
  viewModelHelp: 'Pelela: view model asociado a este template',
  clickHelp: 'Pelela: ejecuta un método del view model al hacer click en el elemento',
  enterHelp: 'Pelela: ejecuta un método del view model al presionar Enter',
  ifHelp: 'Pelela: renderiza el elemento solo cuando la condición es verdadera',
  forEachHelp: 'Pelela: itera sobre una colección y renderiza el elemento por cada ítem',
  indexHelp: 'Pelela: nombre de la variable de índice en un for-each',
  bindAltHelp: 'Pelela: bindea el atributo alt a una propiedad del view model',
  bindClassHelp: 'Pelela: bindea el atributo class a una propiedad del view model',
  bindContentHelp: 'Pelela: bindea el contenido del elemento a una propiedad del view model',
  bindEnabledHelp: 'Pelela: bindea el estado disabled a una propiedad del view model',
  bindSrcHelp: 'Pelela: bindea el atributo src a una propiedad del view model',
  bindStyleHelp: 'Pelela: bindea el atributo style a una propiedad del view model',
  bindValueHelp: 'Pelela: bindea el atributo value a una propiedad del view model',
  propHelp: 'Pelela: one-way binding para pasar datos a un componente hijo (padre → hijo)',
  linkHelp: 'Pelela: two-way binding entre componente padre e hijo (padre ↔ hijo)',
  constHelp: 'Pelela: binding de valor constante a un componente hijo',
} as const satisfies TranslationSchema['hover']

export const es = {
  diagnostics,
  completions,
  hover,
} as const satisfies TranslationSchema
