import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'mocha'

const EXTENSION_ROOT = join(__dirname, '..')
const MANIFEST_PATH = join(EXTENSION_ROOT, 'package.json')
const NLS_EN_PATH = join(EXTENSION_ROOT, 'package.nls.json')
const NLS_ES_PATH = join(EXTENSION_ROOT, 'package.nls.es.json')

const RENAME_COMMAND = 'pelela.renameComponent'
const MOVE_COMMAND = 'pelela.moveComponent'
const NEW_COMMAND = 'pelela.newComponent'
const ADD_TESTING_COMMAND = 'pelela.addTesting'
const COMPONENT_SOURCE_PATH_PATTERN = String.raw`(^|[\/\\])src[\/\\]`
const COMPONENT_WHEN_PREFIX =
  'resourceExtname == .pelela || (resourceExtname == .ts && resourcePath =~ /'
const COMPONENT_WHEN = `${COMPONENT_WHEN_PREFIX}${COMPONENT_SOURCE_PATH_PATTERN}/)`
const POSIX_COMPONENT_VIEW_MODEL_PATH = '/workspace/app/src/components/nav-bar.ts'
const WINDOWS_COMPONENT_VIEW_MODEL_PATH = String.raw`C:\workspace\app\src\components\nav-bar.ts`

interface Manifest {
  contributes: {
    commands: Array<{ command: string; title: string; category: string }>
    menus: Record<string, Array<{ command: string; when: string; group?: string }>>
    configuration: {
      title: string
      properties: Record<string, { type: string; default: string; description: string }>
    }
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T
}

function collectNlsKeys(references: string[]): string[] {
  return references.flatMap((reference) => {
    const match = /^%(?<key>\w+)%$/.exec(reference)
    return match?.groups?.key === undefined ? [] : [match.groups.key]
  })
}

function manifestNlsReferences(manifest: Manifest): string[] {
  const commandTitles = manifest.contributes.commands.map((command) => command.title)
  const configurationDescriptions = Object.values(
    manifest.contributes.configuration.properties
  ).map((property) => property.description)

  return [...commandTitles, ...configurationDescriptions]
}

describe('extension manifest', () => {
  const manifest = readJson<Manifest>(MANIFEST_PATH)

  it('contributes the four CLI-backed commands', () => {
    assert.deepEqual(manifest.contributes.commands, [
      { command: RENAME_COMMAND, title: '%renameComponent%', category: 'Pelela' },
      { command: MOVE_COMMAND, title: '%moveComponent%', category: 'Pelela' },
      { command: NEW_COMMAND, title: '%newComponent%', category: 'Pelela' },
      { command: ADD_TESTING_COMMAND, title: '%addTesting%', category: 'Pelela' },
    ])
  })

  it('shows the component commands in the explorer context menu', () => {
    assert.deepEqual(manifest.contributes.menus['explorer/context'], [
      { command: RENAME_COMMAND, when: COMPONENT_WHEN, group: 'pelela@1' },
      { command: MOVE_COMMAND, when: COMPONENT_WHEN, group: 'pelela@2' },
      { command: NEW_COMMAND, when: 'explorerResourceIsFolder', group: 'navigation@10' },
    ])
  })

  it('matches TypeScript component paths with POSIX and Windows separators', () => {
    const componentSourcePath = new RegExp(COMPONENT_SOURCE_PATH_PATTERN)

    assert.match(POSIX_COMPONENT_VIEW_MODEL_PATH, componentSourcePath)
    assert.match(WINDOWS_COMPONENT_VIEW_MODEL_PATH, componentSourcePath)
  })

  it('shows the component commands in the command palette for templates', () => {
    assert.deepEqual(manifest.contributes.menus.commandPalette, [
      { command: RENAME_COMMAND, when: 'editorLangId == pelela' },
      { command: MOVE_COMMAND, when: 'editorLangId == pelela' },
    ])
  })

  it('declares the CLI settings', () => {
    assert.deepEqual(manifest.contributes.configuration, {
      title: 'Pelela',
      properties: {
        'pelela.cli.path': {
          type: 'string',
          default: '',
          description: '%cliPathDescription%',
        },
        'pelela.cli.nodePath': {
          type: 'string',
          default: 'node',
          description: '%cliNodePathDescription%',
        },
      },
    })
  })

  it('references only existing English localization keys', () => {
    const nls = readJson<Record<string, string>>(NLS_EN_PATH)

    manifestNlsReferences(manifest).forEach((reference) => {
      const [key] = collectNlsKeys([reference])
      assert.equal(typeof nls[key], 'string')
    })
  })

  it('keeps the Spanish localization in sync with the English one', () => {
    const en = readJson<Record<string, string>>(NLS_EN_PATH)
    const es = readJson<Record<string, string>>(NLS_ES_PATH)

    assert.deepEqual(Object.keys(es), Object.keys(en))
    Object.values(es).forEach((value) => {
      assert.notEqual(value, '')
    })
  })
})
