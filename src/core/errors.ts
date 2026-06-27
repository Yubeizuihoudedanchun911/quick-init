export class QuickInitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuickInitError'
  }
}
