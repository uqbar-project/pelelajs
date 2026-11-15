import * as vscode from 'vscode'
import { addTesting } from './addTesting'
import { createCliRunner } from './cliRunner'
import { createComponent } from './createComponent'
import { moveComponent } from './moveComponent'
import { renameComponent } from './renameComponent'

export const PELELA_COMMANDS = {
  renameComponent: 'pelela.renameComponent',
  moveComponent: 'pelela.moveComponent',
  newComponent: 'pelela.newComponent',
  addTesting: 'pelela.addTesting',
} as const

const OUTPUT_CHANNEL_NAME = 'Pelela'

export function registerPelelaCommands(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME)
  const runCli = createCliRunner(output)

  context.subscriptions.push(
    output,
    vscode.commands.registerCommand(PELELA_COMMANDS.renameComponent, (uri?: vscode.Uri) =>
      renameComponent(runCli, uri)
    ),
    vscode.commands.registerCommand(PELELA_COMMANDS.moveComponent, (uri?: vscode.Uri) =>
      moveComponent(runCli, uri)
    ),
    vscode.commands.registerCommand(PELELA_COMMANDS.newComponent, (uri?: vscode.Uri) =>
      createComponent(runCli, uri)
    ),
    vscode.commands.registerCommand(PELELA_COMMANDS.addTesting, () => addTesting(runCli))
  )
}
