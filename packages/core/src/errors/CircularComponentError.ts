import { PelelaError } from './PelelaError'

export class CircularComponentError extends PelelaError {
  constructor(
    public readonly componentChain: string[],
    options?: ErrorOptions,
  ) {
    const chain = componentChain.join(' -> ')
    const message = `[pelela] Circular component dependency detected: ${chain}

A component cannot use itself directly or indirectly through other components.

Component chain: ${chain}

Please review your component hierarchy to break the circular dependency.`

    super(message, options)
  }
}
