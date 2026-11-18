export const PELELA_EXTENSION = '.pelela'
export const TYPESCRIPT_EXTENSION = '.ts'

export type ComponentExtension = typeof PELELA_EXTENSION | typeof TYPESCRIPT_EXTENSION

const COMPONENT_EXTENSIONS: ComponentExtension[] = [PELELA_EXTENSION, TYPESCRIPT_EXTENSION]

function replaceExtension(
  filePath: string,
  currentExtension: string,
  newExtension: string
): string {
  return filePath.endsWith(currentExtension)
    ? `${filePath.slice(0, -currentExtension.length)}${newExtension}`
    : filePath
}

export function toViewModelPath(pelelaPath: string): string {
  return replaceExtension(pelelaPath, PELELA_EXTENSION, TYPESCRIPT_EXTENSION)
}

export function toPelelaPath(filePath: string): string {
  return replaceExtension(filePath, TYPESCRIPT_EXTENSION, PELELA_EXTENSION)
}

export function removeComponentExtension(filePath: string): string {
  const extension = COMPONENT_EXTENSIONS.find((candidate) => filePath.endsWith(candidate))
  return extension === undefined ? filePath : filePath.slice(0, -extension.length)
}

export function isComponentExtension(extension: string): extension is ComponentExtension {
  return COMPONENT_EXTENSIONS.some((componentExtension) => componentExtension === extension)
}
