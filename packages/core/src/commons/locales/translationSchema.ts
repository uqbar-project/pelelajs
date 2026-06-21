type ErrorTranslations = {
  bindings: {
    invalidSyntax: string
    srcOnlyForImg: string
    altOnlyForImg: string
    enabledOnlyForFormControls: string
    value: {
      invalidElement: string
    }
    invalidBindingAttribute: string
  }
  dom: {
    invalidStructure: string
  }
  handlers: {
    invalid: string
    unknownEvent: string
  }
  properties: {
    invalidType: string
    validation: string
  }
  viewmodel: {
    registration: {
      duplicate: string
      missing: string
    }
  }
  security: {
    domEnvironmentRequired: string
    prototypePollution: string
    selfClosingError: string
  }
  routing: {
    routeNotFound: string
    componentNotRegistered: string
    routerNotStarted: string
  }
  compiler: {
    missingRoot: string
    malformedTemplate: string
    multipleRoots: string
    missingClosingTag: string
    unbalancedTags: string
    foreignInterpolation: string
    foreignPropertyBinding: string
    invalidComponentAttribute: string
    onlyForImg: string
    missingParentProperty: string
    missingViewModel: string
    forbiddenRootAttribute: string
    directiveOutsideRoot: string
    unknownComponent: string
    unknownComponentProperty: string
  }
  ui: {
    errorPage: {
      title: string
      header: string
      stackTrace: string
      noStack: string
    }
  }
}

export type TranslationSchema = {
  errors: ErrorTranslations
}
