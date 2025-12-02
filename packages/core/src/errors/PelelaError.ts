/**
 * Base class for all Pelela framework errors.
 *
 * Supports optional error chaining via the `cause` parameter to preserve
 * stack traces when wrapping errors.
 *
 * @example
 * ```typescript
 * // Without cause
 * throw new PropertyValidationError('myProp', 'bind-value', 'MyViewModel', '<div>');
 *
 * // With cause - wrapping another error
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   throw new PropertyValidationError('myProp', 'bind-value', 'VM', '<div>',
 *     { cause: error });
 * }
 * ```
 */
export abstract class PelelaError extends Error {
  /**
   * @param message - The error message
   * @param options - Optional configuration
   * @param options.cause - The original error that caused this error to be thrown.
   *                        Use this when wrapping/re-throwing errors to preserve
   *                        the original stack trace. The cause will be available
   *                        via the standard `error.cause` property (ES2022+).
   */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}
