import { describe, expect, it } from 'vitest'
import { rewriteComponentCode } from '../../src/utils/componentCodeRewrite'

const HOME_PATHS = new Map<string, string>([
  ['./home', './dashboard'],
  ['./components/home/home', './dashboard/dashboard'],
])

const rewriteHomePath = (importPath: string): string => HOME_PATHS.get(importPath) ?? importPath

const rewrite = (content: string, filePath = 'app.ts'): string =>
  rewriteComponentCode(content, filePath, {
    oldClass: 'Home',
    newClass: 'Dashboard',
    rewritePath: rewriteHomePath,
  })

describe('rewriteComponentCode', () => {
  it('rewrites component references but keeps string literals and property keys untouched', () => {
    const content = [
      "import { Home } from './home'",
      "const pageTitle = 'Home'",
      'const page = new Home()',
      'const config = { Home: 1 }',
    ].join('\n')

    expect(rewrite(content)).toBe(
      [
        "import { Dashboard } from './dashboard'",
        "const pageTitle = 'Home'",
        'const page = new Dashboard()',
        'const config = { Home: 1 }',
      ].join('\n'),
    )
  })

  it('keeps comments untouched when the component is imported', () => {
    const content = [
      "import { Home } from './home'",
      '// The Home component is deprecated',
      'const page = new Home()',
    ].join('\n')

    expect(rewrite(content)).toBe(
      [
        "import { Dashboard } from './dashboard'",
        '// The Home component is deprecated',
        'const page = new Dashboard()',
      ].join('\n'),
    )
  })

  it('keeps property accesses like other.Home untouched', () => {
    const content = [
      "import { Home } from './home'",
      'const page = new Home()',
      "const other = { Home: 'section' }",
      'const label = other.Home',
    ].join('\n')

    expect(rewrite(content)).toBe(
      [
        "import { Dashboard } from './dashboard'",
        'const page = new Dashboard()',
        "const other = { Home: 'section' }",
        'const label = other.Home',
      ].join('\n'),
    )
  })

  it('keeps destructuring keys like { Home: alias } untouched', () => {
    const content = [
      "import { Home } from './home'",
      'const { Home: legacyHome } = context',
      'const page = new legacyHome()',
    ].join('\n')

    expect(rewrite(content)).toBe(
      [
        "import { Dashboard } from './dashboard'",
        'const { Home: legacyHome } = context',
        'const page = new legacyHome()',
      ].join('\n'),
    )
  })

  it('does not rewrite references shadowed by a parameter of the same name', () => {
    const content = [
      "import { Home } from './home'",
      'function render(Home: string) {',
      '  return new Home()',
      '}',
      'const page = new Home()',
    ].join('\n')

    expect(rewrite(content)).toBe(
      [
        "import { Dashboard } from './dashboard'",
        'function render(Home: string) {',
        '  return new Home()',
        '}',
        'const page = new Dashboard()',
      ].join('\n'),
    )
  })

  it('does not rewrite references shadowed by a local block declaration', () => {
    const content = [
      "import { Home } from './home'",
      'export function render() {',
      '  const Home = { label: "local" }',
      '  return Home.label',
      '}',
      'const page = new Home()',
    ].join('\n')

    expect(rewrite(content)).toBe(
      [
        "import { Dashboard } from './dashboard'",
        'export function render() {',
        '  const Home = { label: "local" }',
        '  return Home.label',
        '}',
        'const page = new Dashboard()',
      ].join('\n'),
    )
  })

  it('rewrites shorthand properties while keeping member declarations intact', () => {
    const content = [
      "import { Home } from './home'",
      'const context = { Home }',
      'interface PageMeta { Home: string }',
      'const page = new Home()',
    ].join('\n')

    expect(rewrite(content)).toBe(
      [
        "import { Dashboard } from './dashboard'",
        'const context = { Dashboard }',
        'interface PageMeta { Home: string }',
        'const page = new Dashboard()',
      ].join('\n'),
    )
  })

  it('rewrites references of default imports and the binding itself', () => {
    const content = ["import Home from './home'", 'const page = new Home()'].join('\n')

    expect(rewrite(content)).toBe(
      ["import Dashboard from './dashboard'", 'const page = new Dashboard()'].join('\n'),
    )
  })

  it('updates the imported symbol name while keeping the local alias', () => {
    const content = [
      "import { Home as LegacyHome } from './home'",
      'const page = new LegacyHome()',
    ].join('\n')

    expect(rewrite(content)).toBe(
      [
        "import { Dashboard as LegacyHome } from './dashboard'",
        'const page = new LegacyHome()',
      ].join('\n'),
    )
  })

  it('updates the exported symbol name while keeping the local alias', () => {
    const content = "export { Home as LegacyHome } from './home'"

    expect(rewrite(content)).toBe("export { Dashboard as LegacyHome } from './dashboard'")
  })

  it('only rewrites module paths when the file does not import the component', () => {
    const content = [
      "import './components/home/home'",
      "const label = 'Home'",
      'const page = new Home()',
    ].join('\n')

    expect(rewrite(content)).toBe(
      ["import './dashboard/dashboard'", "const label = 'Home'", 'const page = new Home()'].join(
        '\n',
      ),
    )
  })

  it('keeps the class declaration of a file that does not import the component', () => {
    const content = ['export class Home {', '  render() {}', '}'].join('\n')

    expect(rewrite(content)).toBe(content)
  })

  it('rewrites internal references of the moved component file without a self-import', () => {
    const content = [
      'export class Home {',
      '  static create() {',
      '    return new Home()',
      '  }',
      '}',
    ].join('\n')

    const rewritten = rewriteComponentCode(content, 'src/dashboard/dashboard.ts', {
      oldClass: 'Home',
      newClass: 'Dashboard',
      rewritePath: rewriteHomePath,
      isMovedComponentFile: true,
    })

    expect(rewritten).toBe(
      [
        'export class Dashboard {',
        '  static create() {',
        '    return new Dashboard()',
        '  }',
        '}',
      ].join('\n'),
    )
  })

  it('rewrites dynamic import paths', () => {
    const content = "const loader = () => import('./home')"

    expect(rewrite(content)).toBe("const loader = () => import('./dashboard')")
  })

  it('rewrites side-effect import paths', () => {
    const content = "import './components/home/home'\nexport const app = true"

    expect(rewrite(content)).toBe("import './dashboard/dashboard'\nexport const app = true")
  })

  it('rewrites multiline import declarations', () => {
    const content = ['import {', '  Home,', "} from './home'", 'const page = new Home()'].join('\n')

    expect(rewrite(content)).toBe(
      ['import {', '  Dashboard,', "} from './dashboard'", 'const page = new Dashboard()'].join(
        '\n',
      ),
    )
  })
})
