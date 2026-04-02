import chalk from 'chalk'
import boxen from 'cli-box'
import { t } from '../utils/i18n'
import { directoryExists, resolvePath } from '../utils/shell'
import { copyTemplate, updateProjectPackageJson, validateTemplatePath } from '../utils/templates'

const { log } = console
const DEFAULT_PROJECT_NAME = 'Example'

export interface InitCommandOptions {
  projectName?: string
}

export function normalizeProjectName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function validateProjectName(projectName: string): void {
  if (!projectName || projectName.length === 0) {
    throw new Error(t('commands.init.error.nameEmpty'))
  }

  if (projectName.length > 100) {
    throw new Error(t('commands.init.error.nameTooLong'))
  }
}

export async function initCommand(options: InitCommandOptions): Promise<void> {
  const projectName = normalizeProjectName(options.projectName || DEFAULT_PROJECT_NAME)

  validateProjectName(projectName)

  if (!validateTemplatePath()) {
    throw new Error(t('commands.init.error.templateNotFound'))
  }

  const projectPath = resolvePath(projectName)

  if (directoryExists(projectPath)) {
    throw new Error(t('commands.init.error.directoryExists', { projectName }))
  }

  try {
    copyTemplate(projectPath)
    updateProjectPackageJson(projectPath, projectName)

    displaySuccessMessage(projectName)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(t('commands.init.error.initializationFailed', { error: errorMessage }))
  }
}

function displaySuccessMessage(projectName: string): void {
  const message = chalk.green.bold(t('messages.success', { projectName }))

  const box = boxen(message)

  log(`\n${box}\n`)

  log(chalk.dim(t('messages.nextSteps')))
  log(chalk.cyan(`  ${t('messages.cdProject', { projectName })}`))
  log(chalk.cyan(`  ${t('messages.install')}`))
  log(chalk.cyan(`  ${t('messages.dev')}`))
  log()
}
