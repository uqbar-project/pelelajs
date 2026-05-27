import { execSync } from 'node:child_process'

let needsLogin = false

// Check Marketplace (vsce)
try {
  execSync('npx vsce show-token', { stdio: 'pipe' })
} catch {
  console.log('\n❌ Not authenticated in VSCode Marketplace.')
  console.log('Please run "npx vsce login uqbar" to authenticate.')
  needsLogin = true
}

// Check OpenVSX (ovsx)
try {
  execSync('npx ovsx show-token', { stdio: 'pipe' })
} catch {
  console.log('\n❌ Not authenticated in OpenVSX.')
  console.log('Please run "npx ovsx login" to authenticate.')
  needsLogin = true
}

if (needsLogin) {
  console.error('\n❌ Authentication required for VSCode Marketplace and/or OpenVSX.')
  process.exit(1)
}
