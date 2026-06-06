import type { TranslationSchema } from './translationSchema'

const errors = {
  bindings: {
    invalidSyntax:
      '[pelela] Invalid {{kind}} expression: "{{expression}}". Expected format: {{format}}',
    srcOnlyForImg: 'bind-src can only be used on <img> elements. Found on <{{tag}}>.',
    value: {
      invalidElement:
        'bind-value can only be used on input, textarea, or select elements. Found on <{{tagName}}>. Use bind-content for display elements.\nElement: {{snippet}}',
    },
  },
  dom: {
    invalidStructure: '[pelela] {{kind}}: Cannot setup binding, {{issue}}',
  },
  handlers: {
    invalid:
      '[pelela] Handler "{{name}}" defined in {{eventInfo}} is not a function of view model "{{viewModel}}".',
    unknownEvent: 'an event handler',
  },
  properties: {
    invalidType:
      '[pelela] Property "{{name}}" used in {{kind}} must be {{expected}}, but found different type on view model "{{viewModel}}". Element: {{snippet}}',
    validation:
      '[pelela] Unknown property "{{name}}" used in {{kind}} on: {{snippet}}. Make sure your view model "{{viewModel}}" defines it.',
  },
  viewmodel: {
    registration: {
      duplicate: '[pelela] View model "{{name}}" is already registered',
      missing: '[pelela] View model "{{name}}" is not registered. Did you call defineViewModel?',
    },
  },
  security: {
    domEnvironmentRequired: 'sanitizeHTML requires a DOM environment (document and DOMParser)',
    prototypePollution: '[pelela] Prototype pollution blocked on key: {{keys}}',
  },
  routing: {
    routeNotFound: '[pelela] No route defined for "{{path}}"',
    componentNotRegistered:
      '[pelela] Component "{{name}}" has no template registered. Did you call defineComponent?',
    routerNotStarted: '[pelela] Router not started. Call router.start() before using {{action}}.',
  },
  compiler: {
    missingRoot:
      'Pelela template "{{filePath}}" must contain exactly one <pelela ...> or <component ...> as root.',
    malformedTemplate:
      'Malformed template: expected <pelela>...</pelela> or <component>...</component> with matching tags, got: {{template}}',
    multipleRoots: 'Pelela template "{{filePath}}" has {{count}} root tags. Only one is allowed.',
    missingClosingTag: 'Pelela template "{{filePath}}" has no corresponding closing tag.',
    unbalancedTags: 'Pelela template "{{filePath}}" has an unbalanced number of root tags.',
    foreignInterpolation:
      'Pelela template "{{filePath}}" contains unsupported "{{ expression }}" syntax. PelelaJS does not allow mustache-style interpolation. Use binding directives like bind-content="value" instead.',
    foreignPropertyBinding:
      'Pelela template "{{filePath}}" contains Angular-like property binding ("[property]=value"). PelelaJS does not support JS constructs in HTML. Pass static attributes and delegate logic to the ViewModel.',
    invalidComponentAttribute:
      'Component <{{tag}}>: attribute "{{attr}}" must use "prop-" (one-way), "link-" (two-way) or "const-" prefix',
    missingParentProperty:
      'Component <{{tag}}>: parent property "{{parentKey}}" does not exist in parent view model',
    missingViewModel: 'Pelela template "{{filePath}}" must contain view-model="..." attribute',
    forbiddenRootAttribute:
      'Pelela template "{{filePath}}": Attribute "{{attr}}" is not allowed on root tag <{{tagName}}>. Logic and binding attributes can only be used on internal elements or component invocations.',
    unknownComponent:
      'Unknown component: <{{tagName}}>. Did you forget to register it?\nFound at: {{snippet}}',
  },
} as const satisfies TranslationSchema['errors']

export const en = {
  errors,
} as const satisfies TranslationSchema
