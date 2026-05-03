type ErrorTranslations = {
  bindings: {
    invalidSyntax: string
    value: {
      invalidElement: string
    }
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
  }
  routing: {
    routeNotFound: string
    componentNotRegistered: string
    routerNotStarted: string
  }
  compiler: {
    missingRoot: string
    multipleRoots: string
    missingClosingTag: string
    unbalancedTags: string
    foreignInterpolation: string
    foreignPropertyBinding: string
    invalidComponentAttribute: string
    missingParentProperty: string
    missingViewModel: string
    forbiddenRootAttribute: string
  }
}

export type TranslationSchema = {
  errors: ErrorTranslations
}
