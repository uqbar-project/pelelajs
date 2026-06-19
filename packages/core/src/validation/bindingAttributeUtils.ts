import { LINK_PREFIX, PROP_PREFIX } from '../commons/dom'

const EXACT_BINDING_ATTRIBUTES = ['click', 'if', 'for-each', 'index'] as const
const BIND_PREFIX_ATTRIBUTES = [
  'bind-value',
  'bind-content',
  'bind-src',
  'bind-class',
  'bind-style',
] as const
type ExactBindingAttribute = (typeof EXACT_BINDING_ATTRIBUTES)[number]
type BindPrefixAttribute = (typeof BIND_PREFIX_ATTRIBUTES)[number]

export function isBindingAttribute(attrName: string): boolean {
  if (
    /^aria-/.test(attrName) ||
    /^data-/.test(attrName) ||
    attrName === 'role' ||
    /^xml-/.test(attrName)
  ) {
    return false
  }

  return (
    BIND_PREFIX_ATTRIBUTES.includes(attrName as BindPrefixAttribute) ||
    attrName.startsWith(LINK_PREFIX) ||
    attrName.startsWith(PROP_PREFIX) ||
    EXACT_BINDING_ATTRIBUTES.includes(attrName as ExactBindingAttribute)
  )
}
