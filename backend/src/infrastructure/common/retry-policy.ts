/**
 * RetryPolicy - Generic retry mechanism with exponential backoff
 *
 * Implements retry logic with exponential backoff for transient failures.
 * Useful for operations that may fail temporarily (network issues, database locks, etc.)
 *
 * Requirements: 5.5 - Retry up to 3 times before escalating
 */
export interface RetryPolicyConfig {
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

export class RetryPolicy {
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;
  private readonly backoffMultiplier: number;

  constructor(
    config: RetryPolicyConfig = {
      maxAttempts: 3,
      initialDelayMs: 100,
      backoffMultiplier: 2,
    },
  ) {
    this.maxAttempts = config.maxAttempts;
    this.initialDelayMs = config.initialDelayMs;
    this.backoffMultiplier = config.backoffMultiplier;
  }

  /**
   * Executes an async operation with retry logic
   *
   * @param operation - The async operation to execute
   * @param operationName - Name of the operation for logging
   * @returns Promise resolving to the operation result
   * @throws Error if all retry attempts fail
   */
  async execute<R>(
    operation: () => Promise<R>,
    operationName: string = "Operation",
  ): Promise<{ result: R; attempts: number }> {
    let lastError: Error | null = null;
    let delayMs = this.initialDelayMs;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return { result, attempts: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // If this is the last attempt, don't delay
        if (attempt < this.maxAttempts) {
          await this.delay(delayMs);
          delayMs *= this.backoffMultiplier;
        }
      }
    }

    throw new Error(
      `${operationName} failed after ${this.maxAttempts} attempts. Last error: ${lastError?.message}`,
    );
  }

  /**
   * Executes an async operation with retry logic, returning result or null on failure
   *
   * @param operation - The async operation to execute
   * @param operationName - Name of the operation for logging
   * @returns Promise resolving to { result, attempts } or { result: null, attempts, error }
   */
  async executeWithFallback<R>(
    operation: () => Promise<R>,
    operationName: string = "Operation",
  ): Promise<{ result: R | null; attempts: number; error?: Error }> {
    let lastError: Error | null = null;
    let delayMs = this.initialDelayMs;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return { result, attempts: attempt };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxAttempts) {
          await this.delay(delayMs);
          delayMs *= this.backoffMultiplier;
        }
      }
    }

    return {
      result: null,
      attempts: this.maxAttempts,
      error:
        lastError ||
        new Error(`${operationName} failed after ${this.maxAttempts} attempts`),
    };
  }

  /**
   * Delays execution for the specified number of milliseconds
   *
   * @param ms - Number of milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
