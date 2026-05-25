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
  oldComponentName: string
  newComponentName: string
}

export async function renameCommand(options: RenameCommandOptions): Promise<void> {
  const { oldComponentName, newComponentName } = options

  if (!oldComponentName) {
    throw new Error(t('commands.rename.error.oldNameEmpty'))
  }
  if (!newComponentName) {
    throw new Error(t('commands.rename.error.newNameEmpty'))
  }

  const basenameNewComponentName = basename(newComponentName)
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(basenameNewComponentName)) {
    throw new Error(t('commands.rename.error.nameInvalid'))
  }

  const oldTsFile = findComponentFile(oldComponentName, '.ts')
  if (!oldTsFile) {
    throw new Error(t('commands.rename.error.oldNotFound', { name: oldComponentName }))
  }

  const targetDir = dirname(oldTsFile)
  const normalizedNewName = normalizeComponentName(newComponentName, targetDir)
  const kebabNewName = toKebabCase(normalizedNewName)

  const newTsFile = join(targetDir, `${kebabNewName}.ts`)
  const newPelelaFile = join(targetDir, `${kebabNewName}.pelela`)
  const newCssFile = join(targetDir, `${kebabNewName}.css`)

  if (existsSync(newTsFile) || existsSync(newPelelaFile) || existsSync(newCssFile)) {
    throw new Error(t('commands.rename.error.newNameExists', { name: newComponentName }))
  }

  try {
    renameTsFile(oldComponentName, newComponentName, targetDir)
    renamePelelaFile(oldComponentName, newComponentName, targetDir)
    renameCssFile(oldComponentName, newComponentName, targetDir)
    updateImports(oldComponentName, newComponentName)

    console.log(
      chalk.green(
        t('commands.rename.messages.success', {
          oldName: oldComponentName,
          newName: newComponentName,
        }),
      ),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(t('commands.rename.error.renameFailed', { error: message }))
  }
}
