import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { renameCommand } from '../../src/commands/rename'
import { initializeI18n, t } from '../../src/utils/i18n'

const OLD_TS = 'src/old.ts'
const OLD_PELELA = 'src/old.pelela'
const OLD_CSS = 'src/old.css'
const NEW_TS = 'src/new.ts'
const NEW_PELELA = 'src/new.pelela'
const NEW_CSS = 'src/new.css'

const OLD_CONTENT_TS = 'export class Old {}'
const OLD_CONTENT_PELELA = '<pelela view-model="Old"></pelela>'
const ROUTES_CONTENT = "import { Old } from './src/old'\nexport const r = [{ component: Old }]"

beforeAll(async () => {
  await initializeI18n('en')
})

describe('renameCommand (Integration)', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()
    tempDir = mkdtempSync(join(tmpdir(), 'rename-test-'))
    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('throws for empty old name', async () => {
    await expect(renameCommand({ oldComponentName: '', newComponentName: 'New' })).rejects.toThrow(
      t('commands.rename.error.oldNameEmpty'),
    )
  })

  it('throws for empty new name', async () => {
    await expect(renameCommand({ oldComponentName: 'Old', newComponentName: '' })).rejects.toThrow(
      t('commands.rename.error.newNameEmpty'),
    )
  })

  it('throws for invalid new name', async () => {
    await expect(
      renameCommand({ oldComponentName: 'Old', newComponentName: 'invalid-name' }),
    ).rejects.toThrow(t('commands.rename.error.nameInvalid'))
  })

  it('throws if old files do not exist', async () => {
    await expect(
      renameCommand({ oldComponentName: 'Old', newComponentName: 'New' }),
    ).rejects.toThrow(t('commands.rename.error.oldNotFound', { name: 'Old' }))
  })

  it('throws if new files already exist', async () => {
    mkdirSync('src')
    writeFileSync(OLD_TS, OLD_CONTENT_TS)
    writeFileSync(NEW_TS, 'export class New {}')

    await expect(
      renameCommand({ oldComponentName: 'Old', newComponentName: 'New' }),
    ).rejects.toThrow(t('commands.rename.error.newNameExists', { name: 'New' }))
  })

  it('renames files and updates content successfully', async () => {
    mkdirSync('src')
    writeFileSync(OLD_TS, OLD_CONTENT_TS)
    writeFileSync(OLD_PELELA, OLD_CONTENT_PELELA)
    writeFileSync(OLD_CSS, '/* old css */')
    writeFileSync('routes.ts', ROUTES_CONTENT)

    await renameCommand({ oldComponentName: 'Old', newComponentName: 'New' })

    expect(existsSync(OLD_TS)).toBe(false)
    expect(existsSync(OLD_PELELA)).toBe(false)
    expect(existsSync(OLD_CSS)).toBe(false)

    expect(existsSync(NEW_TS)).toBe(true)
    expect(existsSync(NEW_PELELA)).toBe(true)
    expect(existsSync(NEW_CSS)).toBe(true)

    const updatedTs = readFileSync(NEW_TS, 'utf-8')
    const updatedPelela = readFileSync(NEW_PELELA, 'utf-8')
    const updatedRoutes = readFileSync('routes.ts', 'utf-8')

    expect(updatedTs).toContain('export class New {}')
    expect(updatedPelela).toContain('<pelela view-model="New"></pelela>')
    expect(updatedRoutes).toContain("import { New } from './src/new'")
    expect(updatedRoutes).toContain('component: New')
  })

  it('renames lowercase template files when user provides PascalCase name', async () => {
    mkdirSync('src')
    writeFileSync('src/base.ts', 'export class Base {}')
    writeFileSync('src/base.pelela', '<pelela view-model="Base"></pelela>')
    writeFileSync('src/base.css', '/* base css */')

    await renameCommand({ oldComponentName: 'Base', newComponentName: 'Home' })

    expect(existsSync('src/base.ts')).toBe(false)
    expect(existsSync('src/base.pelela')).toBe(false)
    expect(existsSync('src/base.css')).toBe(false)

    expect(existsSync('src/home.ts')).toBe(true)
    expect(existsSync('src/home.pelela')).toBe(true)
    expect(existsSync('src/home.css')).toBe(true)

    expect(readFileSync('src/home.ts', 'utf-8')).toContain('class Home')
    expect(readFileSync('src/home.pelela', 'utf-8')).toContain('view-model="Home"')
  })

  it('renames component in subdirectory', async () => {
    mkdirSync('src')
    mkdirSync('src/subdir')
    writeFileSync('src/subdir/old.ts', OLD_CONTENT_TS)
    writeFileSync('src/subdir/old.pelela', OLD_CONTENT_PELELA)
    writeFileSync('src/subdir/old.css', '/* old css */')

    await renameCommand({ oldComponentName: 'Old', newComponentName: 'New' })

    expect(existsSync('src/subdir/old.ts')).toBe(false)
    expect(existsSync('src/subdir/old.pelela')).toBe(false)
    expect(existsSync('src/subdir/old.css')).toBe(false)

    expect(existsSync('src/subdir/new.ts')).toBe(true)
    expect(existsSync('src/subdir/new.pelela')).toBe(true)
    expect(existsSync('src/subdir/new.css')).toBe(true)
  })

  it('updates import path when filename is lowercase in import statement', async () => {
    mkdirSync('src')
    writeFileSync(OLD_TS, OLD_CONTENT_TS)
    writeFileSync(OLD_PELELA, OLD_CONTENT_PELELA)
    writeFileSync(OLD_CSS, '/* old css */')
    const routesContent = "import { Old } from './src/old'\nexport const r = [{ component: Old }]"
    writeFileSync('routes.ts', routesContent)

    await renameCommand({ oldComponentName: 'Old', newComponentName: 'New' })

    const updatedRoutes = readFileSync('routes.ts', 'utf-8')
    expect(updatedRoutes).toContain("import { New } from './src/new'")
    expect(updatedRoutes).toContain('component: New')
  })

  it('does not rename classes with similar prefix (word boundary)', async () => {
    mkdirSync('src')
    const tsContent = 'export class Old {}\nexport class OldHelper {}'
    writeFileSync('src/old.ts', tsContent)
    writeFileSync('src/old.pelela', OLD_CONTENT_PELELA)
    writeFileSync('src/old.css', '/* old css */')

    await renameCommand({ oldComponentName: 'Old', newComponentName: 'New' })

    const updatedTs = readFileSync('src/new.ts', 'utf-8')
    expect(updatedTs).toContain('export class New {}')
    expect(updatedTs).toContain('export class OldHelper {}')
  })
})
