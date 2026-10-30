import chalk from 'chalk'
import boxen from 'cli-box'
import { t } from '../utils/i18n'
import { installDependencies, pathExists, resolvePath } from '../utils/shell'
import { copyTemplate, updateProjectPackageJson, validateTemplatePath } from '../utils/templates'
import { applyTestingPreset } from '../utils/testingPreset'

const DEFAULT_PROJECT_NAME = 'Example'

export interface InitCommandOptions {
  projectName?: string
  testing?: boolean
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
  const projectName = normalizeProjectName(options.projectName ?? DEFAULT_PROJECT_NAME)

  validateProjectName(projectName)

  if (!validateTemplatePath()) {
    throw new Error(t('commands.init.error.templateNotFound'))
  }

  const projectPath = resolvePath(projectName)

  if (pathExists(projectPath)) {
    throw new Error(t('commands.init.error.directoryExists', { projectName }))
  }

  try {
    copyTemplate(projectPath)
    updateProjectPackageJson(projectPath, projectName)
    if (options.testing) {
      applyTestingPreset(projectPath)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(t('commands.init.error.initializationFailed', { error: errorMessage }))
  }

  installDependencies(projectPath)

  displaySuccessMessage(projectName)
}

function displaySuccessMessage(projectName: string): void {
  const successMessage = t('messages.success', { projectName })
  const message = chalk.green.bold(successMessage)
  const visibleLength = successMessage.length
  const box = boxen({ w: visibleLength + 4, h: 3 }, message)

  console.log(`\n${box}\n`)

  console.log(chalk.dim(t('messages.nextSteps')))
  console.log(chalk.cyan(`  ${t('messages.cdProject', { projectName })}`))
  console.log(chalk.cyan(`  ${t('messages.dev')}`))
  console.log()
}
