import type { TranslationSchema } from './translationSchema'

const diagnostics = {
  viewModelMissingExport:
    'The class "{{name}}" must be exported in {{tsFileName}}. Add the export keyword to the class.',
  viewModelWrongCase:
    'Define the view model with the exact class case: the class is named "{{expectedName}}", not "{{name}}".',
  viewModelNotFound:
    'There is no class named "{{name}}" in {{tsFileName}}. Define the class with the name suggested by the file: "{{suggestedName}}".',
  viewModelNotAClassObject:
    'An Object cannot be used as a view model: "{{name}}" ({{tsFileName}}). You must declare a class.',
  viewModelNotAClassFunction:
    'A Function cannot be used as a view model: "{{name}}" ({{tsFileName}}). You must declare a class.',
  propertyNotFound: "Property '{{name}}' does not exist in the ViewModel",
  methodNotFound: "Method '{{name}}' does not exist in the ViewModel",
  methodNeedsGetter:
    'Method \'{{name}}\' exists but is not bindable. Convert it into a getter by adding "get": get {{name}}() { ... }',
  getterAsMethod:
    '\'{{name}}\' is a getter, but events must invoke a method. Remove the "get" keyword: {{name}}() { ... }',
  arrowFunctionAsMethod:
    "'{{name}}' is an arrow function, but events must invoke a method. Arrow functions are not allowed in a view model. Convert it into a method: {{name}}() { ... }",
  arrowFunctionNotAllowed:
    "'{{name}}' is an arrow function, but bindings must read a property. Arrow functions are not allowed in a view model. Convert it into a getter: get {{name}}() { ... }",
  propertyCaseMismatch:
    "Property '{{name}}' does not match by case. Did you mean '{{suggestedName}}'?",
  methodCaseMismatch: "Method '{{name}}' does not match by case. Did you mean '{{suggestedName}}'?",
  propertyAsMethod:
    "Events must invoke a method; they cannot reference a ViewModel property like '{{name}}'.",
  unknownAttribute: "Unknown attribute: '{{name}}'",
  attributeNotAllowed: "Attribute '{{name}}' is not allowed on element '{{tag}}'",
  invalidComponentAttribute:
    "Component '<{{tag}}>': attribute '{{name}}' must use 'prop-', 'link-', or 'const-' prefix",
} as const satisfies TranslationSchema['diagnostics']

const completions = {
  viewModelDetail: 'Pelela: ViewModel associated with the template',
  clickDetail: 'Pelela: executes a ViewModel method on click',
  enterDetail: 'Pelela: executes a ViewModel method on Enter key press',
  ifDetail: 'Pelela: conditional rendering',
  forEachDetail: 'Pelela: iterates over a ViewModel collection',
  indexDetail: 'Pelela: index variable name in a for-each loop',
  bindDetail: 'Pelela: binds a ViewModel property to an element attribute',
  propDetail: 'Pelela: one-way binding to a child component',
  linkDetail: 'Pelela: two-way binding to a child component',
  constDetail: 'Pelela: constant value for a child component',
  methodDetail: 'Pelela ViewModel method',
  propertyDetail: 'Pelela ViewModel property',
  getterDetail: 'Pelela ViewModel getter',
  iterationPropertyDetail: 'Pelela iteration property',
  nestedPropertyDetail: 'Pelela ViewModel nested property',
} as const satisfies TranslationSchema['completions']

const hover = {
  viewModelHelp: 'Pelela: ViewModel associated with this template',
  clickHelp: 'Pelela: executes a ViewModel method when the element is clicked',
  enterHelp: 'Pelela: executes a ViewModel method when Enter is pressed',
  ifHelp: 'Pelela: renders the element only when the condition is true',
  forEachHelp: 'Pelela: iterates over a collection and renders the element for each item',
  indexHelp: 'Pelela: specifies the index variable name in a for-each loop',
  bindAltHelp: 'Pelela: binds the alt attribute to a ViewModel property',
  bindClassHelp: 'Pelela: binds the class attribute to a ViewModel property',
  bindContentHelp: 'Pelela: binds the element content to a ViewModel property',
  bindEnabledHelp: 'Pelela: binds the enabled state to a ViewModel property',
  bindSrcHelp: 'Pelela: binds the src attribute to a ViewModel property',
  bindStyleHelp: 'Pelela: binds the style attribute to a ViewModel property',
  bindValueHelp: 'Pelela: binds the value attribute to a ViewModel property',
  propHelp: 'Pelela: one-way binding to pass data to a child component (parent → child)',
  linkHelp: 'Pelela: two-way binding between parent and child component (parent ↔ child)',
  constHelp: 'Pelela: constant value binding to a child component',
} as const satisfies TranslationSchema['hover']

export const en = {
  diagnostics,
  completions,
  hover,
} as const satisfies TranslationSchema
