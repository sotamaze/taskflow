import { Logger } from '@nestjs/common';
import { OnTaskVerifiedOptions } from 'src/interfaces';

export class CallbackHelper {
  /**
   * Execute a callback function with retry mechanism
   *
   * @param callbackFn - The async function to be executed
   * @param taskId - Unique identifier for the task
   * @param options - Configuration options for retry mechanism
   * @param options.maxAttempts - Maximum number of retry attempts (default: 3)
   * @param options.backoffStrategy - Backoff strategy for delays between retries (default: 'fixed')
   * @param options.backoffTime - Base time for calculating delay between retries (default: 1000ms)
   * @throws {Error} Throws the last error if all retry attempts fail
   */
  static async executeWithRetry(
    callbackFn: () => Promise<void>,
    taskId: string,
    options: OnTaskVerifiedOptions = {},
  ): Promise<void> {
    const logger = new Logger(CallbackHelper.name);
    const {
      maxAttempts = 3,
      backoffStrategy = 'fixed',
      backoffTime = 1000,
    } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.log(`Executing callback for task ${taskId}, attempt ${attempt}`);
        await callbackFn(); // Execute the callback function
        logger.log(`Callback executed successfully for task ${taskId}`);
        return;
      } catch (error) {
        logger.error(
          `Callback failed for task ${taskId}, attempt ${attempt}`,
          error.stack,
        );

        if (attempt === maxAttempts) {
          throw error; // Throw error if max attempts reached
        }

        // Calculate delay between retry attempts
        const delay = this.getBackoffDelay(
          attempt,
          backoffTime,
          backoffStrategy,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Calculate delay between retry attempts based on selected strategy
   *
   * @param attempt - Current retry attempt number
   * @param baseTime - Base time for calculating delay
   * @param strategy - Backoff strategy to use
   * @returns Calculated delay in milliseconds
   */
  private static getBackoffDelay(
    attempt: number,
    baseTime: number,
    strategy: string,
  ): number {
    switch (strategy) {
      case 'exponential':
        return baseTime * Math.pow(2, attempt - 1);
      case 'linear':
        return baseTime * attempt;
      default:
        return baseTime;
    }
  }
}
