declare module '*.pelela' {
  export const viewModelName: string
  const template: string
  export default template
}

declare module 'virtual:pelela-auto-register' {
  export {}
}

declare module '*.css' {
  const css: string
  export default css
}
