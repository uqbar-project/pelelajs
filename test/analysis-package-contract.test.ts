import { valid } from 'semver'
import { describe, expect, it } from 'vitest'
import rootPackage from '../package.json'
import corePackage from '../packages/core/package.json'
import vitePluginPackage from '../packages/vite-plugin-pelelajs/package.json'
import cliPackage from '../tools/pelela-cli/package.json'

const workspaceTypeScriptVersion = rootPackage.devDependencies.typescript

describe('analysis package dependency contract', () => {
  it.each([corePackage, vitePluginPackage, cliPackage])(
    '$name declares the exact workspace TypeScript version as a runtime dependency',
    (packageInfo) => {
      expect(valid(workspaceTypeScriptVersion)).toBe(workspaceTypeScriptVersion)
      expect(packageInfo.dependencies.typescript).toBe(workspaceTypeScriptVersion)
      expect(Object.hasOwn(packageInfo.devDependencies, 'typescript')).toBe(false)
    },
  )
})
