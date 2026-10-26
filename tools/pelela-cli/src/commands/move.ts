import { existsSync } from 'node:fs'
import { basename, isAbsolute, join, relative, resolve, win32 } from 'node:path'
import chalk from 'chalk'
import {
  findComponentFile,
  getComponentBasePath,
  getComponentTargetDir,
  moveComponentFiles,
  normalizeComponentName,
  toKebabCase,
  updateImports,
  validateBasename,
} from '../utils/componentFiles'
import { t } from '../utils/i18n'

export interface MoveCommandOptions {
  source: string
  destination: string
}

function normalizeMovePath(path: string): string {
  const normalizedPath = path.replace(/\\/g, '/')
  const pathSegments = normalizedPath.split('/')
  const hasInvalidSegment = pathSegments.some(
    (pathSegment) => !pathSegment || pathSegment === '.' || pathSegment === '..',
  )

  if (
    !normalizedPath ||
    isAbsolute(normalizedPath) ||
    win32.isAbsolute(path) ||
    hasInvalidSegment ||
    normalizedPath.includes('\0')
  ) {
    throw new Error(t('commands.move.error.pathInvalid'))
  }

  validateBasename(normalizedPath, 'commands.move.error.pathInvalid')
  return normalizedPath
}

function resolveDestinationPath(destination: string, targetRoot: string): string {
  const normalizedDestination = normalizeComponentName(destination, targetRoot)
  const destinationBasePath = join(targetRoot, toKebabCase(normalizedDestination))
  const resolvedTargetRoot = resolve(targetRoot)
  const resolvedDestination = resolve(destinationBasePath)
  const relativeDestination = relative(resolvedTargetRoot, resolvedDestination)

  if (relativeDestination.startsWith('..') || isAbsolute(relativeDestination)) {
    throw new Error(t('commands.move.error.pathInvalid'))
  }

  return destinationBasePath
}

export async function moveCommand(options: MoveCommandOptions): Promise<void> {
  const source = normalizeMovePath(options.source)
  const destination = normalizeMovePath(options.destination)
  const targetRoot = getComponentTargetDir()
  const sourceTsPath = findComponentFile(source, '.ts')

  if (!sourceTsPath) {
    throw new Error(t('commands.move.error.sourceNotFound', { source: options.source }))
  }

  const sourceBasePath = getComponentBasePath(sourceTsPath)
  const sourcePelelaPath = `${sourceBasePath}.pelela`
  if (!existsSync(sourcePelelaPath)) {
    throw new Error(t('commands.move.error.templateNotFound', { source: options.source }))
  }

  const destinationBasePath = resolveDestinationPath(destination, targetRoot)
  const destinationFiles = ['.ts', '.pelela', '.css'].map(
    (extension) => `${destinationBasePath}${extension}`,
  )
  if (destinationFiles.some((destinationFile) => existsSync(destinationFile))) {
    throw new Error(
      t('commands.move.error.destinationExists', { destination: options.destination }),
    )
  }

  const sourceName = basename(source)
  const destinationName = basename(destination)
  const oldClassName = basename(normalizeComponentName(sourceName, targetRoot))
  const newClassName = basename(normalizeComponentName(destinationName, targetRoot))
  const destinationTsPath = `${destinationBasePath}.ts`

  try {
    moveComponentFiles(sourceTsPath, destinationBasePath, oldClassName, newClassName)
    updateImports(oldClassName, newClassName, {
      oldFilePath: sourceTsPath,
      newFilePath: destinationTsPath,
    })

    console.log(
      chalk.green(
        t('commands.move.messages.success', {
          source: options.source,
          destination: options.destination,
        }),
      ),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(t('commands.move.error.moveFailed', { error: message }))
  }
}
