import { execSync } from 'node:child_process'
import { stdin, stdout } from 'node:process'
import readline from 'node:readline/promises'

let needsLogin = false

// Check if running in interactive terminal
const isInteractive = stdin.isTTY

// Check Marketplace (vsce)
try {
  execSync('npx vsce show-token', { stdio: 'pipe' })
} catch {
  console.log('\n❌ Not authenticated in VSCode Marketplace.')
  if (isInteractive) {
    const line = readline.createInterface({ input: stdin, output: stdout })
    const answer = await line.question('Do you want to login to Marketplace now? (y/n): ')
    line.close()

    if (answer.toLowerCase() === 'y') {
      console.log('Running npx vsce login...')
      execSync('npx vsce login uqbar', { stdio: 'inherit' })
      console.log('✅ Logged in to Marketplace successfully!')
    } else {
      needsLogin = true
    }
  } else {
    console.log('Please run "npx vsce login uqbar" to authenticate.')
    needsLogin = true
  }
}

// Check OpenVSX (ovsx)
try {
  execSync('npx ovsx show-token', { stdio: 'pipe' })
} catch {
  console.log('\n❌ Not authenticated in OpenVSX.')
  if (isInteractive) {
    const line = readline.createInterface({ input: stdin, output: stdout })
    const answer = await line.question('Do you want to login to OpenVSX now? (y/n): ')
    line.close()

    if (answer.toLowerCase() === 'y') {
      console.log('Running npx ovsx login...')
      execSync('npx ovsx login', { stdio: 'inherit' })
      console.log('✅ Logged in to OpenVSX successfully!')
    } else {
      needsLogin = true
    }
  } else {
    console.log('Please run "npx ovsx login" to authenticate.')
    needsLogin = true
  }
}

if (needsLogin) {
  console.error('❌ Aborting release. Please login to Marketplace and/or OpenVSX manually.')
  process.exit(1)
}
