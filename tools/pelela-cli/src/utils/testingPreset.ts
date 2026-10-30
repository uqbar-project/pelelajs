import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { t } from './i18n'
import { getTemplatePath } from './templates'

interface TestingPresetManifest {
  devDependencies: Record<string, string>
  scripts: Record<string, string>
  compilerOptions: {
    types: string[]
  }
  vscodeExtensions: string[]
}

interface PresetFileUpdate {
  sourcePath: string
  destinationPath: string
}

const UNSAFE_CONFIG_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([key, entry]) => !UNSAFE_CONFIG_KEYS.has(key) && typeof entry === 'string',
    )
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string')
}

function isTestingPresetManifest(value: unknown): value is TestingPresetManifest {
  return (
    isRecord(value) &&
    isStringRecord(value.devDependencies) &&
    isStringRecord(value.scripts) &&
    isRecord(value.compilerOptions) &&
    isStringArray(value.compilerOptions.types) &&
    isStringArray(value.vscodeExtensions)
  )
}

function readFile(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf-8')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(t('commands.testing.error.fileReadFailed', { filePath, error: errorMessage }))
  }
}

function readJsonValue(filePath: string): unknown {
  const content = readFile(filePath)

  try {
    return JSON.parse(content)
  } catch {
    throw new Error(t('commands.testing.error.invalidJson', { filePath }))
  }
}

function readJsonObject(filePath: string): Record<string, unknown> {
  const content = readJsonValue(filePath)
  if (!isRecord(content)) {
    throw new Error(t('commands.testing.error.invalidJson', { filePath }))
  }

  return content
}

function readTestingPresetManifest(presetDirectory: string): TestingPresetManifest {
  const manifestPath = join(presetDirectory, 'preset.json')
  const manifest = readJsonValue(manifestPath)
  if (!isTestingPresetManifest(manifest)) {
    throw new Error(t('commands.testing.error.invalidPreset', { manifestPath }))
  }

  return manifest
}

function mergeStringEntries(
  configuration: Record<string, unknown>,
  section: string,
  additions: Record<string, string>,
  filePath: string,
): Record<string, unknown> {
  const sectionValue = configuration[section]
  const existingEntries = sectionValue === undefined ? {} : sectionValue
  if (!isStringRecord(existingEntries)) {
    throw new Error(t('commands.testing.error.invalidConfig', { filePath, section }))
  }

  const conflict = Object.entries(additions).find(
    ([key, value]) => Object.hasOwn(existingEntries, key) && existingEntries[key] !== value,
  )
  if (conflict) {
    throw new Error(
      t('commands.testing.error.conflict', { filePath, entry: `${section}.${conflict[0]}` }),
    )
  }

  return {
    ...configuration,
    [section]: { ...existingEntries, ...additions },
  }
}

function mergeCompilerTypes(
  tsConfig: Record<string, unknown>,
  typesToAdd: string[],
  filePath: string,
): Record<string, unknown> {
  const compilerOptionsValue = tsConfig.compilerOptions
  const compilerOptions = compilerOptionsValue === undefined ? {} : compilerOptionsValue
  if (!isRecord(compilerOptions)) {
    throw new Error(
      t('commands.testing.error.invalidConfig', { filePath, section: 'compilerOptions' }),
    )
  }

  const existingTypesValue = compilerOptions.types
  const existingTypes = existingTypesValue === undefined ? [] : existingTypesValue
  if (!isStringArray(existingTypes)) {
    throw new Error(
      t('commands.testing.error.invalidConfig', { filePath, section: 'compilerOptions.types' }),
    )
  }

  return {
    ...tsConfig,
    compilerOptions: {
      ...compilerOptions,
      types: [...new Set([...existingTypes, ...typesToAdd])],
    },
  }
}

function mergeVscodeExtensions(
  extensions: Record<string, unknown>,
  recommendationsToAdd: string[],
  filePath: string,
): Record<string, unknown> {
  const existingRecommendationsValue = extensions.recommendations
  const existingRecommendations =
    existingRecommendationsValue === undefined ? [] : existingRecommendationsValue
  if (!isStringArray(existingRecommendations)) {
    throw new Error(
      t('commands.testing.error.invalidConfig', { filePath, section: 'recommendations' }),
    )
  }

  return {
    ...extensions,
    recommendations: [...new Set([...existingRecommendations, ...recommendationsToAdd])],
  }
}

function listFiles(directoryPath: string): string[] {
  if (!existsSync(directoryPath)) {
    return []
  }

  return readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directoryPath, entry.name)
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath]
  })
}

function preparePresetFiles(presetDirectory: string, projectPath: string): PresetFileUpdate[] {
  const presetFilesPath = join(presetDirectory, 'files')
  const sourceFiles = listFiles(presetFilesPath)
  if (sourceFiles.length === 0) {
    throw new Error(t('commands.testing.error.presetFilesMissing', { presetFilesPath }))
  }

  return sourceFiles.map((sourcePath) => ({
    sourcePath,
    destinationPath: join(projectPath, relative(presetFilesPath, sourcePath)),
  }))
}

function validatePresetFiles(fileUpdates: PresetFileUpdate[]): void {
  const conflict = fileUpdates.find(
    ({ sourcePath, destinationPath }) =>
      existsSync(destinationPath) && readFile(destinationPath) !== readFile(sourcePath),
  )

  if (conflict) {
    throw new Error(
      t('commands.testing.error.conflict', {
        filePath: conflict.destinationPath,
        entry: 'file',
      }),
    )
  }
}

function writeJsonFile(filePath: string, content: Record<string, unknown>): void {
  writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`)
}

export function applyTestingPreset(projectPath: string): void {
  const presetDirectory = join(dirname(getTemplatePath()), 'presets', 'testing')
  if (!existsSync(presetDirectory)) {
    throw new Error(t('commands.testing.error.presetNotFound', { presetDirectory }))
  }

  const manifest = readTestingPresetManifest(presetDirectory)
  const packageJsonPath = join(projectPath, 'package.json')
  const tsConfigPath = join(projectPath, 'tsconfig.json')
  const extensionsPath = join(projectPath, '.vscode', 'extensions.json')
  const packageJson = mergeStringEntries(
    readJsonObject(packageJsonPath),
    'devDependencies',
    manifest.devDependencies,
    packageJsonPath,
  )
  const packageWithScripts = mergeStringEntries(
    packageJson,
    'scripts',
    manifest.scripts,
    packageJsonPath,
  )
  const tsConfig = mergeCompilerTypes(
    readJsonObject(tsConfigPath),
    manifest.compilerOptions.types,
    tsConfigPath,
  )
  const extensions = existsSync(extensionsPath) ? readJsonObject(extensionsPath) : {}
  const updatedExtensions = mergeVscodeExtensions(
    extensions,
    manifest.vscodeExtensions,
    extensionsPath,
  )
  const presetFiles = preparePresetFiles(presetDirectory, projectPath)

  validatePresetFiles(presetFiles)

  try {
    presetFiles
      .filter(({ destinationPath }) => !existsSync(destinationPath))
      .forEach(({ sourcePath, destinationPath }) => {
        mkdirSync(dirname(destinationPath), { recursive: true })
        copyFileSync(sourcePath, destinationPath)
      })

    writeJsonFile(packageJsonPath, packageWithScripts)
    writeJsonFile(tsConfigPath, tsConfig)
    mkdirSync(dirname(extensionsPath), { recursive: true })
    writeJsonFile(extensionsPath, updatedExtensions)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(t('commands.testing.error.applyFailed', { error: errorMessage }))
  }
}
