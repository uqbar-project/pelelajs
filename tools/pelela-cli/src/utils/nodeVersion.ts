import rootPackageJson from '../../../../package.json' with { type: 'json' }

export function getRequiredNodeVersion(): string {
  return rootPackageJson.engines.node
}
