export class Badge {
  label!: string
  color: string = 'blue'

  get badgeClass() {
    return `badge badge-${this.color}`
  }
}

