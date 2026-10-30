import chalk from 'chalk'
import { t } from '../utils/i18n'
import { installDependencies, resolvePath } from '../utils/shell'
import { applyTestingPreset } from '../utils/testingPreset'

export interface AddCommandOptions {
  preset: string
}

export function addCommand(options: AddCommandOptions): void {
  if (options.preset !== 'testing') {
    throw new Error(t('commands.add.error.unknownPreset', { preset: options.preset }))
  }

  const projectPath = resolvePath()

  applyTestingPreset(projectPath)
  installDependencies(projectPath)

  console.log(chalk.green(t('commands.add.messages.testingApplied')))
}
