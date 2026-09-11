import * as fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer, type ViteDevServer } from 'vite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pelelajsPlugin } from './index'

const REPO_ROOT = process.cwd()
const RESOLVED_VIRTUAL_ID = '\0virtual:pelela-auto-register'

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pelela-hmr-fixtures-'))
}

function removeTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true })
}

async function createDevServer(root: string): Promise<ViteDevServer> {
  return createServer({
    root,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true },
    cacheDir: path.join(root, '.vite'),
    optimizeDeps: { noDiscovery: true },
    resolve: {
      alias: [
        { find: 'pelelajs', replacement: path.resolve(REPO_ROOT, 'packages/core/dist/index.js') },
      ],
    },
    plugins: [pelelajsPlugin()],
  })
}

async function transformUntil(
  server: ViteDevServer,
  predicate: (code: string) => boolean,
  timeoutMs = 5000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const result = await server.transformRequest(RESOLVED_VIRTUAL_ID)
    if (result?.code) {
      if (predicate(result.code)) {
        return result.code
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error(`timed out waiting for regenerated ${RESOLVED_VIRTUAL_ID}`)
}

describe('virtual auto-register module hot reload', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = createTempDir()
  })

  afterEach(() => {
    removeTempDir(tempDir)
  })

  it('regenerates the auto-register module after the view model error is fixed', async () => {
    const srcDir = path.join(tempDir, 'src')
    fs.mkdirSync(srcDir, { recursive: true })
    fs.writeFileSync(path.join(srcDir, 'app.ts'), 'export function App() { return 0 }\n')
    fs.writeFileSync(
      path.join(srcDir, 'app.pelela'),
      '<pelela view-model="App"><h1>Hola</h1></pelela>\n',
    )

    const originalCwd = process.cwd
    process.cwd = () => tempDir

    let server: ViteDevServer | undefined
    try {
      server = await createDevServer(tempDir)

      const brokenCode = await server.transformRequest(RESOLVED_VIRTUAL_ID)
      expect(brokenCode?.code).toContain('AppStub')

      fs.writeFileSync(path.join(srcDir, 'app.ts'), 'export class App {}\n')
      server.watcher.emit('change', path.join(srcDir, 'app.ts'))

      const fixedCode = await transformUntil(server, (code) => code.includes('import { App }'))

      expect(fixedCode).not.toContain('AppStub')
      expect(fixedCode).toContain('defineComponent("App", App, appTemplate)')
    } finally {
      await server?.close().catch(() => undefined)
      process.cwd = originalCwd
    }
  })
})
