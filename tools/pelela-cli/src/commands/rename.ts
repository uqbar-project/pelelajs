import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import chalk from 'chalk'
import { getComponentTargetDir, renamePelelaFile, renameTsFile } from '../utils/componentFiles'
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
    throw new Error(t('commands.new.error.nameInvalid'))
  }

  const targetDir = getComponentTargetDir()
  const oldTsFile = join(targetDir, `${oldName}.ts`)
  const oldPelelaFile = join(targetDir, `${oldName}.pelela`)
  const newTsFile = join(targetDir, `${newName}.ts`)
  const newPelelaFile = join(targetDir, `${newName}.pelela`)

  if (!existsSync(oldTsFile) && !existsSync(oldPelelaFile)) {
    throw new Error(t('commands.rename.error.oldNotFound', { name: oldName }))
  }

  if (existsSync(newTsFile) || existsSync(newPelelaFile)) {
    throw new Error(t('commands.rename.error.newNameExists', { name: newName }))
  }

  try {
    renameTsFile(oldName, newName, targetDir)
    renamePelelaFile(oldName, newName, targetDir)

    console.log(chalk.green(t('commands.rename.messages.success', { oldName, newName })))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(t('commands.rename.error.renameFailed', { error: message }))
  }
}
