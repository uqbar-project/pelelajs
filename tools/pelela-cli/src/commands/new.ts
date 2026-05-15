import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import chalk from 'chalk'
import {
  createCssFile,
  createPelelaFile,
  createTsFile,
  getComponentTargetDir,
} from '../utils/componentFiles'
import { t } from '../utils/i18n'

export interface NewCommandOptions {
  name: string
  css?: boolean
}

export async function newCommand(options: NewCommandOptions): Promise<void> {
  const { name, css = true } = options

  if (!name) {
    throw new Error(t('commands.new.error.nameEmpty'))
  }

  const componentName = basename(name)
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(componentName)) {
    throw new Error(t('commands.new.error.nameInvalid'))
  }

  const targetDir = getComponentTargetDir()
  const tsFile = join(targetDir, `${name}.ts`)
  const pelelaFile = join(targetDir, `${name}.pelela`)
  const cssFile = join(targetDir, `${name}.css`)

  if (existsSync(tsFile) || existsSync(pelelaFile) || (css && existsSync(cssFile))) {
    throw new Error(t('commands.new.error.filesExist', { name }))
  }

  try {
    createTsFile(name, targetDir)
    createPelelaFile(name, targetDir)
    if (css) {
      createCssFile(name, targetDir)
    }

    console.log(chalk.green(t('commands.new.messages.success', { name })))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(t('commands.new.error.creationFailed', { error: message }))
  }
}
