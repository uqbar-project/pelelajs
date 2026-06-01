import { execSync } from 'node:child_process'
import { stdin as input, stdout as output } from 'node:process'
import readline from 'node:readline/promises'

try {
  execSync('pnpm whoami', { stdio: 'pipe' })
} catch {
  console.log('\n❌ Not authenticated in npm.')
  const line = readline.createInterface({ input, output })
  const answer = await line.question('Do you want to login now? (y/n): ')
  line.close()

  if (answer.toLowerCase() === 'y') {
    console.log('Running pnpm login...')
    execSync('pnpm login', { stdio: 'inherit' })
    console.log('✅ Logged in successfully!')
  } else {
    console.error('❌ Aborting release. Please run pnpm login manually.')
    process.exit(1)
  }
}
