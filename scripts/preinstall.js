const packageManager = process.env.npm_execpath || ''

if (!packageManager.includes('pnpm')) {
  const red = '\x1b[31m'
  const bold = '\x1b[1m'
  const reset = '\x1b[0m'
  const yellow = '\x1b[33m'

  console.error('\n')
  console.error(`${red}${bold}❌ ERROR: This project requires pnpm${reset}`)
  console.error('')
  console.error('This project uses pnpm-specific features that other')
  console.error('package managers do not support.')
  console.error('')
  console.error('Install pnpm:')
  console.error(`  ${yellow}${bold}npm install -g pnpm${reset}`)
  console.error('')
  console.error('Then run:')
  console.error(`  ${yellow}${bold}pnpm install --frozen-lockfile${reset}`)
  console.error('\n')
  process.exit(1)
}
