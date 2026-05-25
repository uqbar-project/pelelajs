import { existsSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import chalk from 'chalk'
import {
  findComponentFile,
  normalizeComponentName,
  renameCssFile,
  renamePelelaFile,
  renameTsFile,
  toKebabCase,
  updateImports,
} from '../utils/componentFiles'
import { t } from '../utils/i18n'

export interface RenameCommandOptions {
  oldName: string
  newName: string
}

export async function renameCommand(options: RenameCommandOptions): Promise<void> {
  const { oldName, newName } = options

  if (!oldName) {
    throw new Error(t('commands.rename.error.oldNameEmpty'))
  }
  if (!newName) {
    throw new Error(t('commands.rename.error.newNameEmpty'))
  }

  const newComponentName = basename(newName)
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(newComponentName)) {
    throw new Error(t('commands.rename.error.nameInvalid'))
  }

  const oldTsFile = findComponentFile(oldName, '.ts')
  if (!oldTsFile) {
    throw new Error(t('commands.rename.error.oldNotFound', { name: oldName }))
  }

  const targetDir = dirname(oldTsFile)
  const normalizedNewName = normalizeComponentName(newName, targetDir)
  const kebabNewName = toKebabCase(normalizedNewName)

  const newTsFile = join(targetDir, `${kebabNewName}.ts`)
  const newPelelaFile = join(targetDir, `${kebabNewName}.pelela`)
  const newCssFile = join(targetDir, `${kebabNewName}.css`)

  if (existsSync(newTsFile) || existsSync(newPelelaFile) || existsSync(newCssFile)) {
    throw new Error(t('commands.rename.error.newNameExists', { name: newName }))
  }

  try {
    renameTsFile(oldName, newName, targetDir)
    renamePelelaFile(oldName, newName, targetDir)
    renameCssFile(oldName, newName, targetDir)
    updateImports(oldName, newName)

    console.log(chalk.green(t('commands.rename.messages.success', { oldName, newName })))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(t('commands.rename.error.renameFailed', { error: message }))
  }
}
