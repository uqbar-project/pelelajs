const packageManager = process.env.npm_execpath || ''

if (!packageManager.includes('pnpm')) {
  console.error('\n'.repeat(2))
  console.error('╔════════════════════════════════════════════════════════════════╗')
  console.error('║                                                                ║')
  console.error('║  ❌  ERROR: This project requires pnpm                         ║')
  console.error('║                                                                ║')
  console.error('║  This project uses pnpm-specific features that other          ║')
  console.error('║  package managers do not support.                              ║')
  console.error('║                                                                ║')
  console.error('║  Install pnpm:                                                 ║')
  console.error('║    npm install -g pnpm                                         ║')
  console.error('║                                                                ║')
  console.error('║  Then run:                                                     ║')
  console.error('║    pnpm install --frozen-lockfile                              ║')
  console.error('║                                                                ║')
  console.error('╚════════════════════════════════════════════════════════════════╝')
  console.error('\n')
  process.exit(1)
}
