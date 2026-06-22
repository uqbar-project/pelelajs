import type { TranslationSchema } from './translationSchema'

const errors = {
  bindings: {
    invalidSyntax:
      '[pelela] Expresión {{kind}} inválida: "{{expression}}". Formato esperado: {{format}}',
    srcOnlyForImg: 'bind-src solo puede usarse en elementos <img>. Se encontró en <{{tag}}>.',
    altOnlyForImg: 'bind-alt solo puede usarse en elementos <img>. Se encontró en <{{tag}}>.',
    enabledOnlyForFormControls:
      'bind-enabled solo puede usarse en controles de formulario (input, select, button, textarea, optgroup, option, fieldset). Se encontró en <{{tag}}>.',
    value: {
      invalidElement:
        'bind-value solo puede usarse en elementos input, textarea o select. Se encontró en <{{tagName}}>. Usá bind-content para elementos de visualización.\nElemento: {{snippet}}',
    },
    invalidBindingAttribute:
      '[pelela] Atributo de binding inválido: "{{attributeName}}". Elemento: {{elementSnippet}}',
  },
  dom: {
    invalidStructure: '[pelela] {{kind}}: No se pudo configurar el binding, {{issue}}',
  },
  handlers: {
    invalid:
      '[pelela] El handler "{{name}}" definido en {{eventInfo}} no es una función del view model "{{viewModel}}".',
    unknownEvent: 'un manejador de eventos',
  },
  properties: {
    invalidType:
      '[pelela] La propiedad "{{name}}" usada en {{kind}} debe ser {{expected}}, pero se encontró un tipo diferente en el view model "{{viewModel}}". Elemento: {{snippet}}',
    validation:
      '[pelela] Propiedad desconocida "{{name}}" usada en {{kind}} en: {{snippet}}. Asegurate de que el view model "{{viewModel}}" la defina.',
  },
  viewmodel: {
    registration: {
      duplicate: '[pelela] El view model "{{name}}" ya está registrado',
      missing: '[pelela] El view model "{{name}}" no está registrado. ¿Llamaste a defineViewModel?',
    },
  },
  security: {
    domEnvironmentRequired: 'sanitizeHTML requiere un entorno DOM (document y DOMParser)',
    prototypePollution: '[pelela] Intento de Prototype Pollution bloqueado en la clave: {{keys}}',
    selfClosingError:
      'HTML5 malformado: El elemento "{{element}}" acepta contenido y no puede ser auto-cerrado. Error encontrado cerca de: "...{{context}}..."',
  },
  routing: {
    routeNotFound: '[pelela] No hay una ruta definida para "{{path}}"',
    componentNotRegistered:
      '[pelela] El componente "{{name}}" no tiene un template registrado. ¿Llamaste a defineComponent?',
    routerNotStarted:
      '[pelela] Router no iniciado. Llamá a router.start() antes de usar {{action}}.',
  },
  compiler: {
    missingRoot:
      'Pelela template "{{filePath}}" debe contener exactamente un <pelela ...> o un <component ...> como raíz.',
    malformedTemplate:
      'Template malformado: se esperaba <pelela>...</pelela> o <component>...</component> con etiquetas coincidentes, se obtuvo: {{template}}',
    multipleRoots:
      'Pelela template "{{filePath}}" tiene {{count}} etiquetas raíz. Solo se permite una.',
    missingClosingTag:
      'Pelela template "{{filePath}}" no tiene etiqueta de cierre correspondiente.',
    unbalancedTags:
      'Pelela template "{{filePath}}" tiene un número desbalanceado de etiquetas raíz.',
    foreignInterpolation:
      'Pelela template "{{filePath}}" contiene sintaxis "{{ expression }}" no soportada. En PelelaJS no se permite interpolación estilo mustache. Usá directivas de binding como bind-content="valor" en su lugar.',
    foreignPropertyBinding:
      'Pelela template "{{filePath}}" contiene property binding tipo Angular ("[property]=value"). En PelelaJS no se admiten construcciones JS en HTML. Pase atributos estáticos y delegue lógica al ViewModel.',
    invalidComponentAttribute:
      'Componente <{{tag}}>: el atributo "{{attr}}" debe usar el prefijo "prop-" (one-way), "link-" (two-way) o "const-"',
    onlyForImg: '{{binding}} solo puede usarse en elementos <img>, no en <{{tag}}>.',
    enterOnlyForInput: 'enter solo puede usarse en elementos <input>. Se encontró en <{{tag}}>.',
    missingParentProperty:
      'Componente <{{tag}}>: la propiedad padre "{{parentKey}}" no existe en el view model padre',
    missingViewModel: 'Pelela template "{{filePath}}" debe contener atributo view-model="..."',
    forbiddenRootAttribute:
      'Pelela template "{{filePath}}": El atributo "{{attr}}" no está permitido en la etiqueta raíz <{{tagName}}>. Los atributos de lógica y binding solo pueden usarse en elementos internos o invocaciones de componentes.',
    directiveOutsideRoot:
      'Pelela template "{{filePath}}": Directiva `{{directive}}` detectada fuera de la etiqueta raíz <{{tagName}}>. Encontrado en: {{snippet}}',
    unknownComponent:
      'Componente desconocido: <{{tagName}}>. ¿Olvidaste registrarlo?\nEncontrado en: {{snippet}}',
    unknownComponentProperty:
      'Componente <{{tag}}> (ViewModel: {{viewModel}}): la propiedad "{{propertyName}}" no está definida en el ViewModel hijo.\nEncontrado en: {{snippet}}',
  },
  ui: {
    errorPage: {
      title: 'Error de Pelela',
      header: 'Error de Pelela',
      stackTrace: 'Traza de la pila (Stack Trace):',
      noStack: 'No hay traza de la pila disponible',
    },
  },
} as const satisfies TranslationSchema['errors']

export const es = {
  errors,
} as const satisfies TranslationSchema
