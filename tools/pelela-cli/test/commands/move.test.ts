import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { moveCommand } from '../../src/commands/move'
import { initializeI18n, t } from '../../src/utils/i18n'

const HOME_TS = 'src/components/home/home.ts'
const HOME_PELELA = 'src/components/home/home.pelela'
const HOME_CSS = 'src/components/home/home.css'
const ROUTES_PATH = 'src/routes.ts'
const ROUTES_CONTENT = `import {
  Home,
} from './components/home/home'
export const route = Home`

beforeAll(async () => {
  await initializeI18n('en')
})

describe('moveCommand (Integration)', () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()
    tempDir = mkdtempSync(join(tmpdir(), 'move-test-'))
    process.chdir(tempDir)
    mkdirSync('src/components/home', { recursive: true })
    writeFileSync(HOME_TS, 'export class Home {}')
    writeFileSync(HOME_PELELA, '<pelela view-model="Home"></pelela>')
    writeFileSync(HOME_CSS, '/* home css */')
    writeFileSync(ROUTES_PATH, ROUTES_CONTENT)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('moves a component to another directory and renames it', async () => {
    writeFileSync('src/components/home/unrelated.json', '{"kept":true}')

    await moveCommand({
      source: 'components/home/Home',
      destination: 'components/dashboard/Dashboard',
    })

    expect(existsSync(HOME_TS)).toBe(false)
    expect(existsSync(HOME_PELELA)).toBe(false)
    expect(existsSync(HOME_CSS)).toBe(false)
    expect(existsSync('src/components/dashboard/dashboard.ts')).toBe(true)
    expect(existsSync('src/components/dashboard/dashboard.pelela')).toBe(true)
    expect(existsSync('src/components/dashboard/dashboard.css')).toBe(true)
    expect(existsSync('src/components/home/unrelated.json')).toBe(true)
    expect(readFileSync('src/components/dashboard/dashboard.ts', 'utf-8')).toContain(
      'class Dashboard',
    )
    expect(readFileSync('src/components/dashboard/dashboard.pelela', 'utf-8')).toContain(
      'view-model="Dashboard"',
    )
    expect(readFileSync(ROUTES_PATH, 'utf-8')).toBe(
      `import {
  Dashboard,
} from './components/dashboard/dashboard'
export const route = Dashboard`,
    )
  })

  it('moves a component into a deeper directory', async () => {
    await moveCommand({
      source: 'components/home/Home',
      destination: 'components/home/reports/Reports',
    })

    expect(existsSync(HOME_TS)).toBe(false)
    expect(existsSync('src/components/home/reports/reports.ts')).toBe(true)
    expect(existsSync('src/components/home/reports/reports.pelela')).toBe(true)
    expect(existsSync('src/components/home/reports/reports.css')).toBe(true)
  })

  it('moves a component when it has no CSS file', async () => {
    rmSync(HOME_CSS)

    await moveCommand({
      source: 'components/home/Home',
      destination: 'components/dashboard/Dashboard',
    })

    expect(existsSync('src/components/dashboard/dashboard.ts')).toBe(true)
    expect(existsSync('src/components/dashboard/dashboard.pelela')).toBe(true)
    expect(existsSync('src/components/dashboard/dashboard.css')).toBe(false)
  })

  it('moves a component to another project structure', async () => {
    await moveCommand({
      source: 'components/home/Home',
      destination: 'pages/reports/Reports',
    })

    expect(existsSync(HOME_TS)).toBe(false)
    expect(existsSync('src/pages/reports/reports.ts')).toBe(true)
    expect(existsSync('src/pages/reports/reports.pelela')).toBe(true)
    expect(existsSync('src/pages/reports/reports.css')).toBe(true)
    expect(readFileSync(ROUTES_PATH, 'utf-8')).toBe(
      `import {
  Reports,
} from './pages/reports/reports'
export const route = Reports`,
    )
  })

  it('normalizes Windows path separators', async () => {
    await moveCommand({
      source: 'components\\home\\Home',
      destination: 'components\\dashboard\\Dashboard',
    })

    expect(existsSync('src/components/dashboard/dashboard.ts')).toBe(true)
    expect(existsSync('src/components/dashboard/dashboard.pelela')).toBe(true)
  })

  it('rejects a missing component without creating the destination directory', async () => {
    await expect(
      moveCommand({
        source: 'components/missing/Missing',
        destination: 'pages/reports/Report',
      }),
    ).rejects.toThrow(
      t('commands.move.error.sourceNotFound', { source: 'components/missing/Missing' }),
    )

    expect(existsSync('src/pages')).toBe(false)
  })

  it('rejects an occupied destination without changing the source', async () => {
    mkdirSync('src/components/dashboard', { recursive: true })
    writeFileSync('src/components/dashboard/dashboard.ts', 'export class Existing {}')

    await expect(
      moveCommand({
        source: 'components/home/Home',
        destination: 'components/dashboard/Dashboard',
      }),
    ).rejects.toThrow(
      t('commands.move.error.destinationExists', {
        destination: 'components/dashboard/Dashboard',
      }),
    )

    expect(existsSync(HOME_TS)).toBe(true)
    expect(existsSync(HOME_PELELA)).toBe(true)
    expect(readFileSync(HOME_TS, 'utf-8')).toBe('export class Home {}')
    expect(existsSync('src/components/dashboard/dashboard.pelela')).toBe(false)
  })

  it('rejects moving a component to its current path without changing it', async () => {
    await expect(
      moveCommand({
        source: 'components/home/Home',
        destination: 'components/home/Home',
      }),
    ).rejects.toThrow(
      t('commands.move.error.destinationExists', {
        destination: 'components/home/Home',
      }),
    )

    expect(existsSync(HOME_TS)).toBe(true)
    expect(existsSync(HOME_PELELA)).toBe(true)
    expect(existsSync(HOME_CSS)).toBe(true)
  })

  it('rejects invalid paths without creating destination directories', async () => {
    await expect(
      moveCommand({
        source: '../home/Home',
        destination: 'pages/reports/Report',
      }),
    ).rejects.toThrow(t('commands.move.error.pathInvalid'))

    expect(existsSync('src/pages')).toBe(false)
    expect(existsSync(HOME_TS)).toBe(true)
  })

  it('rejects a source without a matching template before changing files', async () => {
    rmSync(HOME_PELELA)

    await expect(
      moveCommand({
        source: 'components/home/Home',
        destination: 'pages/reports/Report',
      }),
    ).rejects.toThrow(t('commands.move.error.templateNotFound', { source: 'components/home/Home' }))

    expect(existsSync(HOME_TS)).toBe(true)
    expect(existsSync('src/pages')).toBe(false)
  })

  it('selects the correct component when directories have similar suffixes', async () => {
    mkdirSync('src/a-components/home', { recursive: true })
    writeFileSync('src/a-components/home/home.ts', 'export class HomeWrong {}')
    writeFileSync('src/a-components/home/home.pelela', '<pelela view-model="HomeWrong"></pelela>')

    await moveCommand({
      source: 'components/home/Home',
      destination: 'components/dashboard/Dashboard',
    })

    expect(existsSync(HOME_TS)).toBe(false)
    expect(existsSync('src/components/dashboard/dashboard.ts')).toBe(true)
    expect(readFileSync('src/components/dashboard/dashboard.ts', 'utf-8')).toContain(
      'class Dashboard',
    )
    expect(existsSync('src/a-components/home/home.ts')).toBe(true)
    expect(readFileSync('src/a-components/home/home.ts', 'utf-8')).toContain('class HomeWrong')
  })

  it('rebases relative imports inside the moved component file', async () => {
    writeFileSync(
      HOME_TS,
      "import './home.css'\nimport { formatDate } from '../../utils/date'\nexport class Home {}",
    )
    mkdirSync('src/utils', { recursive: true })
    writeFileSync('src/utils/date.ts', 'export const formatDate = (): string => ""')

    await moveCommand({
      source: 'components/home/Home',
      destination: 'dashboard/Dashboard',
    })

    const movedContent = readFileSync('src/dashboard/dashboard.ts', 'utf-8')
    expect(movedContent).toContain("import './dashboard.css'")
    expect(movedContent).toContain("import { formatDate } from '../utils/date'")
    expect(movedContent).not.toContain('../../utils/date')
  })

  it('rebases non-relocated siblings and keeps package imports untouched', async () => {
    writeFileSync(
      HOME_TS,
      'import "./sibling"\nimport { join } from "node:path"\nexport class Home {}',
    )
    writeFileSync('src/components/home/sibling.ts', 'export const sibling = 1')

    await moveCommand({
      source: 'components/home/Home',
      destination: 'dashboard/Dashboard',
    })

    const movedContent = readFileSync('src/dashboard/dashboard.ts', 'utf-8')
    expect(movedContent).toContain('import "../components/home/sibling"')
    expect(movedContent).not.toContain('import "./sibling"')
    expect(movedContent).toContain('import { join } from "node:path"')
    expect(existsSync('src/components/home/sibling.ts')).toBe(true)
  })

  it('updates external stylesheet imports during a move', async () => {
    writeFileSync(
      'src/styles.ts',
      "import './components/home/home.css'\nexport const styles = true",
    )

    await moveCommand({
      source: 'components/home/Home',
      destination: 'dashboard/Dashboard',
    })

    const stylesContent = readFileSync('src/styles.ts', 'utf-8')
    expect(stylesContent).toContain("import './dashboard/dashboard.css'")
    expect(stylesContent).not.toContain('components/home/home.css')
  })

  it('keeps external imports of an unrelated stylesheet with a similar name', async () => {
    mkdirSync('src/pages/home', { recursive: true })
    writeFileSync('src/pages/home/home.css', '/* unrelated css */')
    writeFileSync('src/styles.ts', "import './pages/home/home.css'\nexport const styles = true")

    await moveCommand({
      source: 'components/home/Home',
      destination: 'dashboard/Dashboard',
    })

    const stylesContent = readFileSync('src/styles.ts', 'utf-8')
    expect(stylesContent).toContain("import './pages/home/home.css'")
  })

  it('updates the symbol and path of a re-export during a move', async () => {
    writeFileSync(
      ROUTES_PATH,
      "export { Home } from './components/home/home'\nexport const route = Home",
    )

    await moveCommand({
      source: 'components/home/Home',
      destination: 'dashboard/Dashboard',
    })

    const routesContent = readFileSync(ROUTES_PATH, 'utf-8')
    expect(routesContent).toContain("export { Dashboard } from './dashboard/dashboard'")
    expect(routesContent).toContain('export const route = Dashboard')
    expect(routesContent).not.toContain('components/home/home')
  })

  it('updates internal class references inside the moved file', async () => {
    writeFileSync(
      HOME_TS,
      'export class Home {\n  static create() {\n    return new Home()\n  }\n}',
    )

    await moveCommand({
      source: 'components/home/Home',
      destination: 'dashboard/Dashboard',
    })

    const movedContent = readFileSync('src/dashboard/dashboard.ts', 'utf-8')
    expect(movedContent).toBe(
      'export class Dashboard {\n  static create() {\n    return new Dashboard()\n  }\n}',
    )
  })
})
