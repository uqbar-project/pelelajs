export class BaseViewModel {
  title: string = 'View Model Base'
  count: number = 0

  reset(): void {
    this.count = 0
  }

  get description(): string {
    return `${this.title} (contador: ${this.count})`
  }
}

export class App extends BaseViewModel {
  message: string = ''

  increment(): void {
    this.count = this.count + 1
  }
}
