export function getHtmlElements() {
  return [
    'div',
    'span',
    'p',
    'a',
    'button',
    'input',
    'textarea',
    'select',
    'option',
    'label',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'table',
    'tr',
    'td',
    'th',
    'thead',
    'tbody',
    'img',
    'video',
    'audio',
    'section',
    'article',
    'header',
    'footer',
    'nav',
    'aside',
    'main',
  ]
}

export function getHtmlAttributes() {
  return [
    'id',
    'class',
    'style',
    'title',
    'data-',
    'aria-',
    'role',
    'src',
    'href',
    'alt',
    'type',
    'value',
    'placeholder',
    'name',
    'disabled',
    'readonly',
    'required',
    'checked',
    'selected',
    'width',
    'height',
    'target',
    'rel',
  ]
}

export function getPelelaAttributes() {
  return [
    'view-model',
    'bind-alt',
    'bind-class',
    'bind-content',
    'bind-enabled',
    'bind-src',
    'bind-style',
    'bind-value',
    'const-',
    'click',
    'enter',
    'for-each',
    'if',
  ]
}

const TAG_RESTRICTED_PELELA_ATTRIBUTES: Record<string, string[]> = {
  'bind-alt': ['img'],
  'bind-src': ['img'],
  'bind-enabled': ['input', 'select', 'button', 'textarea', 'optgroup', 'option', 'fieldset'],
  'bind-value': ['input', 'textarea', 'select'],
  enter: ['input'],
  'view-model': ['pelela', 'component'],
}

export function getPelelaAttributesForTag(tagName: string | null): string[] {
  const allAttributes = getPelelaAttributes()

  if (!tagName) return allAttributes

  return allAttributes.filter((attr) => {
    const allowedTags = TAG_RESTRICTED_PELELA_ATTRIBUTES[attr]
    if (!allowedTags) return true
    return allowedTags.includes(tagName)
  })
}
