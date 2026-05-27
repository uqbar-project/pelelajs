import { execSync } from 'node:child_process'
import { stdin as input, stdout as output } from 'node:process'
import readline from 'node:readline/promises'

let needsLogin = false

// Check Marketplace (vsce)
try {
  execSync('npx vsce show-token', { stdio: 'pipe' })
} catch {
  console.log('\n❌ Not authenticated in VSCode Marketplace.')
  const line = readline.createInterface({ input, output })
  const answer = await line.question('Do you want to login to Marketplace now? (y/n): ')
  line.close()

  if (answer.toLowerCase() === 'y') {
    console.log('Running npx vsce login...')
    execSync('npx vsce login uqbar', { stdio: 'inherit' })
    console.log('✅ Logged in to Marketplace successfully!')
  } else {
    needsLogin = true
  }
}

// Check OpenVSX (ovsx)
try {
  execSync('npx ovsx show-token', { stdio: 'pipe' })
} catch {
  console.log('\n❌ Not authenticated in OpenVSX.')
  const line = readline.createInterface({ input, output })
  const answer = await line.question('Do you want to login to OpenVSX now? (y/n): ')
  line.close()

  if (answer.toLowerCase() === 'y') {
    console.log('Running npx ovsx login...')
    execSync('npx ovsx login', { stdio: 'inherit' })
    console.log('✅ Logged in to OpenVSX successfully!')
  } else {
    needsLogin = true
  }
}

if (needsLogin) {
  console.error('❌ Aborting release. Please login to Marketplace and/or OpenVSX manually.')
  process.exit(1)
}
