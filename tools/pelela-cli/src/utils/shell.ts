import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

export function createDirectory(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

export function executeCommand(command: string, cwd?: string): string {
  try {
    return execSync(command, {
      cwd: cwd || process.cwd(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    throw new Error(`Command failed: ${command}`, { cause: error })
  }
}

export function resolvePath(...segments: string[]): string {
  return resolve(process.cwd(), ...segments)
}

export function pathExists(dirPath: string): boolean {
  return existsSync(dirPath)
}
