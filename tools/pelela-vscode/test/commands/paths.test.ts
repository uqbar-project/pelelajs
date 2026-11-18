import * as assert from 'node:assert/strict'
import * as path from 'node:path'
import { describe, it } from 'mocha'
import {
  isInsideDirectory,
  toCliComponentPath,
  toCliFolderPath,
  toPosixPath,
} from '../../src/commands/paths'

const POSIX_ROOT = '/projects/app'
const WINDOWS_ROOT = 'C:\\projects\\app'
const WINDOWS_API = path.win32

describe('toPosixPath', () => {
  it('replaces every Windows separator with a forward slash', () => {
    assert.equal(toPosixPath('src\\components\\nav-bar.pelela'), 'src/components/nav-bar.pelela')
  })

  it('leaves an already POSIX path untouched', () => {
    assert.equal(toPosixPath('src/components/nav-bar.pelela'), 'src/components/nav-bar.pelela')
  })
})

describe('toCliComponentPath', () => {
  it('returns the src-relative component path without extension', () => {
    const filePath = path.join(POSIX_ROOT, 'src', 'components', 'nav-bar.pelela')

    assert.equal(toCliComponentPath(filePath, POSIX_ROOT), 'components/nav-bar')
  })

  it('keeps the component name casing', () => {
    const filePath = path.join(POSIX_ROOT, 'src', 'NavBar.pelela')

    assert.equal(toCliComponentPath(filePath, POSIX_ROOT), 'NavBar')
  })

  it('accepts a TypeScript view model path', () => {
    const filePath = path.join(POSIX_ROOT, 'src', 'components', 'nav-bar.ts')

    assert.equal(toCliComponentPath(filePath, POSIX_ROOT), 'components/nav-bar')
  })

  it('converts Windows paths to forward slashes', () => {
    const filePath = WINDOWS_API.join(WINDOWS_ROOT, 'src', 'components', 'nav-bar.pelela')

    assert.equal(toCliComponentPath(filePath, WINDOWS_ROOT, WINDOWS_API), 'components/nav-bar')
  })

  it('rejects a file outside the project root', () => {
    const filePath = path.join(POSIX_ROOT, '..', 'other', 'src', 'nav-bar.pelela')

    assert.equal(toCliComponentPath(filePath, POSIX_ROOT), undefined)
  })

  it('rejects a path on another Windows drive', () => {
    assert.equal(
      toCliComponentPath('D:\\other\\src\\nav-bar.pelela', WINDOWS_ROOT, WINDOWS_API),
      undefined
    )
  })

  it('rejects a file outside the src folder', () => {
    const filePath = path.join(POSIX_ROOT, 'docs', 'nav-bar.pelela')

    assert.equal(toCliComponentPath(filePath, POSIX_ROOT), undefined)
  })

  it('rejects the project root itself', () => {
    assert.equal(toCliComponentPath(POSIX_ROOT, POSIX_ROOT), undefined)
  })

  it('rejects a src file whose name is only the extension', () => {
    const filePath = path.join(POSIX_ROOT, 'src', '.pelela')

    assert.equal(toCliComponentPath(filePath, POSIX_ROOT), undefined)
  })
})

describe('toCliFolderPath', () => {
  it('maps the src folder to the empty path', () => {
    assert.equal(toCliFolderPath(path.join(POSIX_ROOT, 'src'), POSIX_ROOT), '')
  })

  it('returns the src-relative folder', () => {
    assert.equal(
      toCliFolderPath(path.join(POSIX_ROOT, 'src', 'components'), POSIX_ROOT),
      'components'
    )
  })

  it('returns nested src-relative folders', () => {
    assert.equal(
      toCliFolderPath(path.join(POSIX_ROOT, 'src', 'components', 'reports'), POSIX_ROOT),
      'components/reports'
    )
  })

  it('converts Windows folder paths to forward slashes', () => {
    assert.equal(
      toCliFolderPath(
        WINDOWS_API.join(WINDOWS_ROOT, 'src', 'components'),
        WINDOWS_ROOT,
        WINDOWS_API
      ),
      'components'
    )
  })

  it('maps the Windows src folder to the empty path', () => {
    assert.equal(
      toCliFolderPath(WINDOWS_API.join(WINDOWS_ROOT, 'src'), WINDOWS_ROOT, WINDOWS_API),
      ''
    )
  })

  it('rejects a folder outside the src folder', () => {
    assert.equal(toCliFolderPath(path.join(POSIX_ROOT, 'docs'), POSIX_ROOT), undefined)
  })

  it('rejects the project root itself', () => {
    assert.equal(toCliFolderPath(POSIX_ROOT, POSIX_ROOT), undefined)
  })
})

describe('isInsideDirectory', () => {
  it('accepts a nested file', () => {
    assert.equal(
      isInsideDirectory(path.join(POSIX_ROOT, 'src', 'nav-bar.pelela'), POSIX_ROOT),
      true
    )
  })

  it('rejects the directory itself', () => {
    assert.equal(isInsideDirectory(POSIX_ROOT, POSIX_ROOT), false)
  })

  it('rejects a sibling directory', () => {
    assert.equal(isInsideDirectory(path.join('/projects', 'other'), POSIX_ROOT), false)
  })

  it('accepts a nested Windows path', () => {
    assert.equal(
      isInsideDirectory(
        WINDOWS_API.join(WINDOWS_ROOT, 'src', 'nav-bar.pelela'),
        WINDOWS_ROOT,
        WINDOWS_API
      ),
      true
    )
  })
})
