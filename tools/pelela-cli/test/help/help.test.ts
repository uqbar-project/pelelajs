// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import translations from '../../templates/base-template-for-cli/public/help-translations.json'

const PUBLIC_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'templates',
  'base-template-for-cli',
  'public',
)
const HELP_PAGE = 'help.html'
const HELP_TRANSLATIONS = 'help-translations.json'

type MessageTree = { [key: string]: string | MessageTree }
const messages = translations as unknown as Record<'en' | 'es', MessageTree>

const flattenMessages = (tree: MessageTree, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object'
      ? flattenMessages(value, prefix ? `${prefix}.${key}` : key)
      : [prefix ? `${prefix}.${key}` : key],
  )

const lookupMessage = (tree: MessageTree, key: string): string | undefined => {
  const value = key.split('.').reduce<unknown>((current, part) => {
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, part)) {
      return undefined
    }
    return (current as Record<string, unknown>)[part]
  }, tree)

  return typeof value === 'string' ? value : undefined
}

const messageParent = (tree: MessageTree, key: string) => {
  const parts = key.split('.')
  const messageKey = parts.at(-1)
  if (messageKey === undefined) throw new Error('Missing message key')

  const parent = parts.slice(0, -1).reduce<unknown>((current, part) => {
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, part)) {
      throw new Error(`Missing message path: ${part}`)
    }
    return (current as Record<string, unknown>)[part]
  }, tree)

  if (typeof parent !== 'object' || parent === null) {
    throw new Error(`Invalid message path: ${key}`)
  }

  return { parent: parent as Record<string, unknown>, messageKey }
}

const setMessage = (tree: MessageTree, key: string, value: string) => {
  const { parent, messageKey } = messageParent(tree, key)
  parent[messageKey] = value
}

const deleteMessage = (tree: MessageTree, key: string) => {
  const { parent, messageKey } = messageParent(tree, key)
  delete parent[messageKey]
}

const renderHelpPage = () => {
  const html = readFileSync(join(PUBLIC_DIR, HELP_PAGE), 'utf-8')
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/)
  if (!scriptMatch || typeof scriptMatch[1] !== 'string') {
    throw new Error('The help page must contain an inline translation script')
  }

  document.open()
  document.write(html.replace(scriptMatch[0], ''))
  document.close()

  return scriptMatch[1]
}

const successfulFetch = (fetched: unknown) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(fetched),
  })

const startHelpPage = (language: string, fetchMock: ReturnType<typeof vi.fn>) => {
  const script = renderHelpPage()
  runInNewContext(script, {
    navigator: { language },
    document,
    fetch: fetchMock,
  })
}

const flushFetch = () => new Promise<void>((resolve) => setImmediate(resolve))

describe('help page translations', () => {
  it('applies Spanish messages when the browser locale is Spanish', async () => {
    const fetchMock = successfulFetch(messages)
    startHelpPage('es-AR', fetchMock)

    await flushFetch()

    expect(fetchMock).toHaveBeenCalledWith(HELP_TRANSLATIONS)
    expect(document.documentElement.lang).toBe('es')
    expect(document.querySelector('title')?.textContent).toBe(lookupMessage(messages.es, 'title'))
    expect(
      document.querySelector('[data-i18n="sections.cli.rows.init.description"]')?.textContent,
    ).toBe(lookupMessage(messages.es, 'sections.cli.rows.init.description'))
    expect(document.querySelector('[data-i18n="labels.note"]')?.textContent).toBe(
      lookupMessage(messages.es, 'labels.note'),
    )
  })

  it.each(['en-US', 'fr-FR', 'pt-BR', ''])(
    'falls back to English for the %s locale',
    async (language) => {
      startHelpPage(language, successfulFetch(messages))

      await flushFetch()

      expect(document.documentElement.lang).toBe('en')
      expect(document.querySelector('title')?.textContent).toBe(lookupMessage(messages.en, 'title'))
      expect(
        document.querySelector('[data-i18n="sections.cli.rows.init.description"]')?.textContent,
      ).toBe(lookupMessage(messages.en, 'sections.cli.rows.init.description'))
    },
  )

  it('uses the English value when a Spanish key is missing', async () => {
    const partialMessages = structuredClone(messages)
    deleteMessage(partialMessages.es, 'sections.cli.headers.command')

    startHelpPage('es', successfulFetch(partialMessages))

    await flushFetch()

    expect(document.querySelector('[data-i18n="sections.cli.headers.command"]')?.textContent).toBe(
      lookupMessage(messages.en, 'sections.cli.headers.command'),
    )
  })

  it('keeps the inline English fallback when the fetch fails', async () => {
    startHelpPage('es-AR', vi.fn().mockRejectedValue(new Error('network down')))

    await flushFetch()

    expect(document.documentElement.lang).toBe('en')
    expect(document.querySelector('title')?.textContent).toBe(lookupMessage(messages.en, 'title'))
  })

  it('inserts translations as text, never as markup', async () => {
    const dangerousMessages = structuredClone(messages)
    setMessage(dangerousMessages.es, 'sections.cli.title', '<img src="x" onerror="alert(1)">')

    startHelpPage('es', successfulFetch(dangerousMessages))

    await flushFetch()

    expect(document.querySelector('[data-i18n="sections.cli.title"]')?.textContent).toBe(
      lookupMessage(dangerousMessages.es, 'sections.cli.title'),
    )
    expect(document.querySelectorAll('img')).toHaveLength(0)
  })

  it('keeps data-i18n keys in sync with both dictionaries', () => {
    const html = readFileSync(join(PUBLIC_DIR, HELP_PAGE), 'utf-8')
    const parsed = new DOMParser().parseFromString(html, 'text/html')
    const usedKeys = [
      ...new Set(
        [...parsed.querySelectorAll('[data-i18n]')].map(
          (element) => element.getAttribute('data-i18n') ?? '',
        ),
      ),
    ].sort()
    const englishKeys = flattenMessages(messages.en).sort()

    expect(usedKeys).toEqual(englishKeys)
    expect(flattenMessages(messages.es).sort()).toEqual(englishKeys)
    expect(
      usedKeys.every(
        (key) =>
          lookupMessage(messages.en, key) !== undefined &&
          lookupMessage(messages.es, key) !== undefined,
      ),
    ).toBe(true)
  })
})
