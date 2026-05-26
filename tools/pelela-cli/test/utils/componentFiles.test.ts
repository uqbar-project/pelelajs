import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  prepareFile,
  prepareRenamePaths,
  resolveExistingComponentPath,
  toKebabCase,
  toPascalCase,
  updateImports,
} from '../../src/utils/componentFiles'

describe('resolveExistingComponentPath', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()
    tempDir = mkdtempSync(join(tmpdir(), 'component-files-test-'))
    process.chdir(tempDir)
    mkdirSync('src')
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns an existing path when the file exists with matching case', () => {
    writeFileSync('src/MyComponent.ts', '')

    const resolved = resolveExistingComponentPath('MyComponent', 'src', '.ts')

    expect(existsSync(resolved)).toBe(true)
  })

  it('returns an existing path when template used lowercase and user passed PascalCase', () => {
    // Reproduces the Linux bug: template generates base.ts but user passes Base.
    // On a case-sensitive FS the exact path (src/Base.ts) does not exist, so the
    // function must fall back to the lowercase variant (src/base.ts).
    writeFileSync('src/base.ts', '')

    const resolved = resolveExistingComponentPath('Base', 'src', '.ts')

    expect(existsSync(resolved)).toBe(true)
  })

  it('returns an existing path with .pelela extension and lowercase file', () => {
    writeFileSync('src/base.pelela', '')

    const resolved = resolveExistingComponentPath('Base', 'src', '.pelela')

    expect(existsSync(resolved)).toBe(true)
  })

  it('returns an existing path with .css extension and lowercase file', () => {
    writeFileSync('src/base.css', '')

    const resolved = resolveExistingComponentPath('Base', 'src', '.css')

    expect(existsSync(resolved)).toBe(true)
  })

  it('returns the original (non-existing) path when no variant is found', () => {
    // No file is created — both candidates are missing
    const resolved = resolveExistingComponentPath('Ghost', 'src', '.ts')

    expect(existsSync(resolved)).toBe(false)
    expect(resolved).toBe(join('src', 'Ghost.ts'))
  })

  it('returns an existing path for a lowercase file inside a subdirectory', () => {
    mkdirSync('src/sub')
    writeFileSync('src/sub/base.ts', '')

    const resolved = resolveExistingComponentPath('sub/Base', 'src', '.ts')

    expect(existsSync(resolved)).toBe(true)
  })
})

describe('toKebabCase', () => {
  it('converts camelCase to kebab-case', () => {
    expect(toKebabCase('myComponent')).toBe('my-component')
    expect(toKebabCase('fooBar')).toBe('foo-bar')
    expect(toKebabCase('testCase')).toBe('test-case')
  })

  it('handles single word', () => {
    expect(toKebabCase('hello')).toBe('hello')
  })

  it('handles multiple words', () => {
    expect(toKebabCase('myLongComponentName')).toBe('my-long-component-name')
  })

  it('handles already kebab-case', () => {
    expect(toKebabCase('my-component')).toBe('my-component')
  })
})

describe('toPascalCase', () => {
  it('converts kebab-case to PascalCase', () => {
    expect(toPascalCase('my-component')).toBe('MyComponent')
    expect(toPascalCase('foo-bar')).toBe('FooBar')
    expect(toPascalCase('test-case')).toBe('TestCase')
  })

  it('converts snake_case to PascalCase', () => {
    expect(toPascalCase('my_component')).toBe('MyComponent')
    expect(toPascalCase('foo_bar')).toBe('FooBar')
  })

  it('handles single word', () => {
    expect(toPascalCase('hello')).toBe('Hello')
  })

  it('handles multiple words', () => {
    expect(toPascalCase('my-long-component-name')).toBe('MyLongComponentName')
  })

  it('handles already PascalCase', () => {
    expect(toPascalCase('MyComponent')).toBe('MyComponent')
  })
})

describe('prepareFile', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()
    tempDir = mkdtempSync(join(tmpdir(), 'prepare-file-test-'))
    process.chdir(tempDir)
    mkdirSync('src')
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns path with kebab-case filename and normalizedName', () => {
    const result = prepareFile({ name: 'MyComponent', extension: 'ts', targetDir: 'src' })

    expect(result.path).toBe('src/my-component.ts')
    expect(result.normalizedName).toBe('MyComponent')
  })

  it('creates directory if it does not exist', () => {
    prepareFile({ name: 'sub/MyComponent', extension: 'ts', targetDir: 'src' })

    expect(existsSync('src/sub')).toBe(true)
  })

  it('handles subdirectories', () => {
    const result = prepareFile({ name: 'sub/MyComponent', extension: 'ts', targetDir: 'src' })

    expect(result.path).toBe('src/sub/my-component.ts')
    expect(result.normalizedName).toBe('sub/MyComponent')
  })
})

describe('prepareRenamePaths', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()
    tempDir = mkdtempSync(join(tmpdir(), 'prepare-rename-test-'))
    process.chdir(tempDir)
    mkdirSync('src')
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('returns paths with kebab-case for new name', () => {
    writeFileSync('src/old.ts', '')

    const result = prepareRenamePaths({
      oldName: 'Old',
      newName: 'New',
      extension: 'ts',
      targetDir: 'src',
    })

    expect(result.oldPath).toBe('src/old.ts')
    expect(result.newPath).toBe('src/new.ts')
    expect(result.oldClassName).toBe('Old')
    expect(result.newClassName).toBe('New')
  })

  it('creates new directory if it does not exist', () => {
    writeFileSync('src/old.ts', '')

    prepareRenamePaths({
      oldName: 'Old',
      newName: 'new-dir/New',
      extension: 'ts',
      targetDir: 'src',
    })

    expect(existsSync('src/new-dir')).toBe(true)
  })

  it('handles subdirectories', () => {
    mkdirSync('src/sub')
    writeFileSync('src/sub/old.ts', '')

    const result = prepareRenamePaths({
      oldName: 'sub/Old',
      newName: 'sub/New',
      extension: 'ts',
      targetDir: 'src',
    })

    expect(result.oldPath).toBe('src/sub/old.ts')
    expect(result.newPath).toBe('src/sub/new.ts')
    expect(result.oldClassName).toBe('Old')
    expect(result.newClassName).toBe('New')
  })
})

describe('updateImports', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()
    tempDir = mkdtempSync(join(tmpdir(), 'update-imports-test-'))
    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('updates import paths with kebab-case file names when renaming component', () => {
    // Create a file with an import using kebab-case path
    mkdirSync('src')
    writeFileSync(
      'src/app.ts',
      "import { MyComponent } from './src/my-component'\nconst comp = new MyComponent()",
    )

    updateImports('MyComponent', 'OtherComponent')

    const content = readFileSync('src/app.ts', 'utf-8')
    expect(content).toContain("import { OtherComponent } from './src/other-component'")
    expect(content).not.toContain('my-component')
  })

  it('updates import paths with .ts extension when renaming component', () => {
    mkdirSync('src')
    writeFileSync(
      'src/app.ts',
      "import { MyComponent } from './src/my-component.ts'\nconst comp = new MyComponent()",
    )

    updateImports('MyComponent', 'OtherComponent')

    const content = readFileSync('src/app.ts', 'utf-8')
    expect(content).toContain("import { OtherComponent } from './src/other-component.ts'")
  })
})
