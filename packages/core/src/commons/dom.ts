// biome-ignore format: <line length exceeds 100 due to comprehensive HTML tags list>
export const STANDARD_HTML_TAGS = [
  'html', 'head', 'title', 'body', 'div', 'span', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'img', 'script', 'style', 'link', 'meta', 'base', 'form', 'input',
  'button', 'select', 'option', 'textarea', 'label', 'table', 'tr', 'td',
  'th', 'thead', 'tbody', 'tfoot', 'caption', 'col', 'colgroup', 'section',
  'article', 'nav', 'aside', 'header', 'footer', 'main', 'figure', 'figcaption',
  'iframe', 'canvas', 'svg', 'math', 'video', 'audio', 'source', 'track',
  'map', 'area', 'object', 'param', 'embed', 'details', 'summary', 'dialog',
  'template', 'slot', 'time', 'data', 'code', 'pre', 'blockquote', 'q',
  'cite', 'abbr', 'address', 'bdo', 'ins', 'del', 'small', 'strong', 'em',
  'mark', 'sub', 'sup', 'var', 'samp', 'kbd', 'output', 'progress', 'meter',
  'fieldset', 'legend', 'optgroup', 'datalist', 'i', 'b', 'u', 's', 'noscript',
  'picture', 'wbr', 'bdi', 'ruby', 'rt', 'rp', 'dfn', 'hgroup', 'menu', 'search',
] as const

export function isStandardHtmlTag(tagName: string): boolean {
  return STANDARD_HTML_TAGS.includes(tagName.toLowerCase() as (typeof STANDARD_HTML_TAGS)[number])
}

export function isPelelaRootTag(tagName: string): boolean {
  return ['pelela', 'component'].includes(tagName.toLowerCase())
}

export const LINK_PREFIX = 'link-'
export const PROP_PREFIX = 'prop-'

function isValidBindingAttrForComponent(attrName: string): boolean {
  return attrName === 'if'
}

export function isValidComponentAttribute(attrName: string): boolean {
  return (
    attrName.startsWith(LINK_PREFIX) ||
    attrName.startsWith(PROP_PREFIX) ||
    isValidBindingAttrForComponent(attrName)
  )
}
