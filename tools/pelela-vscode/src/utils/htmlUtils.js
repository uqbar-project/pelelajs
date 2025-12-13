function getHtmlElements() {
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

function getHtmlAttributes() {
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

function getPelelaAttributes() {
  return ['view-model', 'bind-value', 'if', 'bind-class', 'bind-style', 'click', 'for-each']
}

module.exports = {
  getHtmlElements,
  getHtmlAttributes,
  getPelelaAttributes,
}
