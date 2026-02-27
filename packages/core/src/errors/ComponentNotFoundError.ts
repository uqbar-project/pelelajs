import { PelelaError } from './PelelaError'

export class ComponentNotFoundError extends PelelaError {
  constructor(
    public readonly componentName: string,
    public readonly elementSnippet: string,
    options?: ErrorOptions,
  ) {
    const message = `[pelela] Component "${componentName}" is not registered.

Did you:
- Create a file named "${componentName}.pelela" in the lib/ or components/ folder?
- Define a matching ViewModel class?
- Ensure the plugin is scanning the correct directories?

Element: ${elementSnippet.substring(0, 100)}${elementSnippet.length > 100 ? '...' : ''}`

    super(message, options)
  }
}
