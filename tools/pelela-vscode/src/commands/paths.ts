import * as nodePath from 'node:path'
import { removeComponentExtension } from '../utils/componentPaths'

const SRC_PREFIX = 'src/'
const WINDOWS_SEPARATOR_PATTERN = /\\/g
const TRAILING_SEPARATOR_PATTERN = /\/+$/

/**
 * Minimal path surface so the Windows rules can be exercised on any OS by
 * injecting `path.win32` in tests.
 */
export interface PathApi {
  relative(from: string, to: string): string
  isAbsolute(value: string): boolean
  sep: string
}

const nativePathApi: PathApi = nodePath

/**
 * Arguments handed to the CLI must always use forward slashes: the CLI
 * normalizes `\` to `/` and composes names with the native `node:path`.
 */
export function toPosixPath(value: string): string {
  return value.replace(WINDOWS_SEPARATOR_PATTERN, '/')
}

function relativeInside(
  basePath: string,
  targetPath: string,
  pathApi: PathApi
): string | undefined {
  const relativePath = pathApi.relative(basePath, targetPath)
  const isOutside =
    relativePath === '' ||
    relativePath === '..' ||
    relativePath.startsWith(`..${pathApi.sep}`) ||
    pathApi.isAbsolute(relativePath)

  return isOutside ? undefined : toPosixPath(relativePath)
}

function stripSrcPrefix(relativePath: string): string | undefined {
  return relativePath.startsWith(SRC_PREFIX) ? relativePath.slice(SRC_PREFIX.length) : undefined
}

/**
 * Converts a `.pelela` or `.ts` file path into the `src`-relative component
 * path the CLI expects (e.g. `components/nav-bar`), using POSIX separators.
 */
export function toCliComponentPath(
  filePath: string,
  projectRoot: string,
  pathApi: PathApi = nativePathApi
): string | undefined {
  const relativePath = relativeInside(projectRoot, filePath, pathApi)
  if (relativePath === undefined) {
    return undefined
  }

  const srcRelativePath = stripSrcPrefix(relativePath)
  if (srcRelativePath === undefined) {
    return undefined
  }

  const componentPath = removeComponentExtension(srcRelativePath)
  return componentPath === '' ? undefined : componentPath
}

/**
 * Converts a folder path into the `src`-relative folder the CLI expects.
 * The `src` folder itself maps to the empty path.
 */
export function toCliFolderPath(
  folderPath: string,
  projectRoot: string,
  pathApi: PathApi = nativePathApi
): string | undefined {
  const relativePath = relativeInside(projectRoot, folderPath, pathApi)
  if (relativePath === undefined) {
    return undefined
  }

  if (relativePath === 'src') {
    return ''
  }

  const srcRelativePath = stripSrcPrefix(relativePath)
  return srcRelativePath?.replace(TRAILING_SEPARATOR_PATTERN, '')
}

export function isInsideDirectory(
  candidate: string,
  directory: string,
  pathApi: PathApi = nativePathApi
): boolean {
  return relativeInside(directory, candidate, pathApi) !== undefined
}
