// biome-ignore format: <line length exceeds 100 due to comprehensive HTML tags list>
export const STANDARD_HTML_TAGS = [
  'html', 'head', 'title', 'body', 'div', 'span', 'p', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'a', 'img', 'script', 'style', 'link', 'meta', 'base', 'form', 'input',
  'button', 'select', 'option', 'textarea', 'label', 'table', 'tr', 'td',
  'th', 'thead', 'tbody', 'tfoot', 'caption', 'col', 'colgroup', 'section',
  'article', 'nav', 'aside', 'header', 'footer', 'main', 'figure', 'figcaption',
  'iframe', 'canvas', 'video', 'audio', 'source', 'track',
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

// Foreign elements (SVG and MathML) belong to their own namespaces per the HTML
// standard, so they are tracked separately from standard HTML tags.
// biome-ignore format: <line length exceeds 100 due to comprehensive foreign elements list>
export const FOREIGN_ELEMENTS = [
  'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse',
  'text', 'tspan', 'textPath', 'use', 'defs', 'symbol', 'marker', 'pattern', 'clipPath',
  'mask', 'filter', 'linearGradient', 'radialGradient', 'stop', 'image', 'foreignObject',
  'desc', 'title', 'metadata', 'view', 'switch', 'animate', 'animateMotion', 'animateTransform',
  'set', 'mpath', 'discard', 'hatch', 'hatchpath', 'a', 'script', 'style',
  'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood',
  'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge',
  'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence',
  'math', 'mi', 'mo', 'mn', 'ms', 'mtext', 'mrow', 'mfrac', 'msqrt', 'mroot',
  'msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover', 'mtable', 'mtr', 'mtd',
  'maction', 'menclose', 'mfenced', 'mpadded', 'mphantom', 'mstyle', 'merror',
  'semantics', 'annotation', 'annotation-xml', 'mprescripts', 'mmultiscripts',
  'mlabeledtr', 'mglyph', 'mspace', 'maligngroup', 'malignmark', 'mlongdiv',
  'mscarries', 'mscarry', 'msgroup', 'msline', 'msrow', 'mstack',
] as const

export function isForeignElement(tagName: string): boolean {
  return FOREIGN_ELEMENTS.includes(tagName.toLowerCase() as (typeof FOREIGN_ELEMENTS)[number])
}

export function isNativeTag(tagName: string): boolean {
  return isStandardHtmlTag(tagName) || isForeignElement(tagName)
}

export function isPelelaRootTag(tagName: string): boolean {
  return ['pelela', 'component'].includes(tagName.toLowerCase())
}

export const ROUTER_HTML_TAGS = ['outlet'] as const

export function isRouterHtmlTag(tagName: string): boolean {
  return ROUTER_HTML_TAGS.includes(tagName.toLowerCase() as (typeof ROUTER_HTML_TAGS)[number])
}

export const LINK_PREFIX = 'link-'
export const PROP_PREFIX = 'prop-'
export const CONST_PREFIX = 'const-'

function isValidBindingAttrForComponent(attrName: string): boolean {
  return attrName === 'if'
}

export function isValidComponentAttribute(attrName: string): boolean {
  return (
    attrName.startsWith(LINK_PREFIX) ||
    attrName.startsWith(PROP_PREFIX) ||
    attrName.startsWith(CONST_PREFIX) ||
    isValidBindingAttrForComponent(attrName)
  )
}
