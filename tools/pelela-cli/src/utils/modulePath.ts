import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export function getCurrentModuleDir(importMetaUrl: string): string {
  return typeof __dirname === 'undefined' ? dirname(fileURLToPath(importMetaUrl)) : __dirname
}
