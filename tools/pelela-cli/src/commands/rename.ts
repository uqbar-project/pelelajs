import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import chalk from 'chalk'
import {
  findComponentFile,
  normalizeComponentName,
  renameCssFile,
  renamePelelaFile,
  renameTsFile,
  resolveExistingComponentPath,
  toKebabCase,
  updateImports,
  validateBasename,
} from '../utils/componentFiles'
import { t } from '../utils/i18n'

export interface RenameCommandOptions {
  oldComponentName: string
  newComponentName: string
}

export async function renameCommand(options: RenameCommandOptions): Promise<void> {
  const { oldComponentName, newComponentName } = options
  const normalizedOldPath = oldComponentName.replace(/\\/g, '/')

  if (!oldComponentName) {
    throw new Error(t('commands.rename.error.oldNameEmpty'))
  }
  if (!newComponentName) {
    throw new Error(t('commands.rename.error.newNameEmpty'))
  }

  validateBasename(normalizedOldPath, 'commands.rename.error.nameInvalid')
  if (newComponentName.includes('/') || newComponentName.includes('\\')) {
    throw new Error(t('commands.rename.error.newNamePathNotAllowed'))
  }
  validateBasename(newComponentName, 'commands.rename.error.nameInvalid')

  const oldTsFile = findComponentFile(normalizedOldPath, '.ts')
  if (!oldTsFile) {
    throw new Error(t('commands.rename.error.oldNotFound', { name: oldComponentName }))
  }

  const targetDir = dirname(oldTsFile)
  const oldFileName = normalizedOldPath.split('/').at(-1) ?? normalizedOldPath
  const normalizedOldName = normalizeComponentName(oldFileName, targetDir)
  const normalizedNewName = normalizeComponentName(newComponentName, targetDir)
  const kebabNewName = toKebabCase(normalizedNewName)

  const newTsFile = join(targetDir, `${kebabNewName}.ts`)
  const newPelelaFile = join(targetDir, `${kebabNewName}.pelela`)
  const newCssFile = join(targetDir, `${kebabNewName}.css`)
  const oldKebabName = toKebabCase(normalizedOldName)
  const oldPelelaFile = resolveExistingComponentPath(oldKebabName, targetDir, '.pelela')

  if (existsSync(newTsFile) || existsSync(newPelelaFile) || existsSync(newCssFile)) {
    throw new Error(t('commands.rename.error.newNameExists', { name: newComponentName }))
  }
  if (!existsSync(oldPelelaFile)) {
    throw new Error(t('commands.rename.error.oldNotFound', { name: oldComponentName }))
  }

  try {
    renameTsFile(oldFileName, newComponentName, targetDir)
    renamePelelaFile(oldFileName, newComponentName, targetDir)
    renameCssFile(oldFileName, newComponentName, targetDir)
    updateImports(normalizedOldName, normalizedNewName, {
      oldFilePath: oldTsFile,
      newFilePath: newTsFile,
    })

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
