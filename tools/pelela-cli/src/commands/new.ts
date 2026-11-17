import { existsSync } from 'node:fs'
import { join } from 'node:path'
import chalk from 'chalk'
import { toKebabCase } from 'pelelajs'
import {
  createCssFile,
  createPelelaFile,
  createSpecFile,
  createTsFile,
  getComponentTargetDir,
  normalizeComponentName,
  validateBasename,
} from '../utils/componentFiles'
import { t } from '../utils/i18n'
import { resolvePath } from '../utils/shell'
import { isTestingConfigured } from '../utils/testingPreset'

export interface NewCommandOptions {
  componentName: string
  css?: boolean
  component?: boolean
}

export async function newCommand(options: NewCommandOptions): Promise<void> {
  const { componentName, css = true, component = false } = options

  if (!componentName) {
    throw new Error(t('commands.new.error.nameEmpty'))
  }

  validateBasename(componentName, 'commands.new.error.nameInvalid')

  const targetDir = getComponentTargetDir()
  const normalizedName = normalizeComponentName(componentName, targetDir)
  const kebabName = toKebabCase(normalizedName)
  const tsFile = join(targetDir, `${kebabName}.ts`)
  const pelelaFile = join(targetDir, `${kebabName}.pelela`)
  const cssFile = join(targetDir, `${kebabName}.css`)
  const specFile = join(targetDir, `${kebabName}.spec.ts`)

  if (
    existsSync(tsFile) ||
    existsSync(pelelaFile) ||
    (css && existsSync(cssFile)) ||
    existsSync(specFile)
  ) {
    throw new Error(t('commands.new.error.filesExist', { name: componentName }))
  }

  try {
    createTsFile(componentName, targetDir)
    createPelelaFile(componentName, targetDir, component ? 'component' : 'pelela')
    if (css) {
      createCssFile(componentName, targetDir)
    }
    if (isTestingConfigured(resolvePath())) {
      createSpecFile(componentName, targetDir)
    }

    console.log(chalk.green(t('commands.new.messages.success', { name: componentName })))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(t('commands.new.error.creationFailed', { error: message }))
  }
}
