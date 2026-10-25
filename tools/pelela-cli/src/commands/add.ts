import chalk from 'chalk'
import { t } from '../utils/i18n'
import { resolvePath } from '../utils/shell'
import { applyTestingPreset } from '../utils/testingPreset'

export interface AddCommandOptions {
  preset: string
}

export function addCommand(options: AddCommandOptions): void {
  if (options.preset !== 'testing') {
    throw new Error(t('commands.add.error.unknownPreset', { preset: options.preset }))
  }

  applyTestingPreset(resolvePath())

  console.log(chalk.green(t('commands.add.messages.testingApplied')))
  console.log(chalk.dim(t('messages.install')))
}
