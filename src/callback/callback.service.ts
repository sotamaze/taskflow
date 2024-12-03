import { Injectable, Logger, Inject } from '@nestjs/common';
import { TASKFLOW_OPTIONS } from 'src/constants';

@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);

  constructor(
    @Inject(TASKFLOW_OPTIONS) // Inject TaskFlow options
    private readonly options: {
      retry?: {
        maxAttempts?: number;
        backoffStrategy?: 'exponential' | 'linear' | 'fixed';
        backoffTime?: number;
      };
    },
  ) {}

  /**
   * Execute the callback function with retry logic.
   * @param callbackFn The callback function to execute.
   * @param taskId The task ID for logging purposes.
   * @throws Error if the maximum retry attempts are exceeded.
   */
  async executeCallback(
    callbackFn: () => Promise<void>,
    taskId: string,
  ): Promise<void> {
    const {
      maxAttempts = 3,
      backoffStrategy = 'fixed',
      backoffTime = 1000,
    } = this.options.retry || {}; // Default to an empty object if retry is undefined

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logAttempt(taskId, attempt);
        await callbackFn();
        this.logger.log(`Callback executed successfully for task ${taskId}`);
        return;
      } catch (error) {
        this.handleCallbackError(taskId, attempt, maxAttempts, error);

        if (attempt >= maxAttempts) {
          throw error;
        }

        const delay = this.calculateBackoffDelay(
          attempt,
          backoffTime,
          backoffStrategy,
        );
        await this.sleep(delay);
      }
    }
  }

  /**
   * Log the current attempt information.
   * @param taskId The task ID.
   * @param attempt The current attempt number.
   */
  private logAttempt(taskId: string, attempt: number): void {
    this.logger.log(
      `Executing callback for task ${taskId}, attempt ${attempt}`,
    );
  }

  /**
   * Handle callback execution errors.
   * @param taskId The task ID.
   * @param attempt The current attempt number.
   * @param maxAttempts The maximum number of retry attempts.
   * @param error The error thrown during callback execution.
   */
  private handleCallbackError(
    taskId: string,
    attempt: number,
    maxAttempts: number,
    error: Error,
  ): void {
    this.logger.error(
      `Callback failed for task ${taskId} on attempt ${attempt}: ${error.message}`,
    );

    if (attempt >= maxAttempts) {
      this.logger.error(`Max retry attempts reached for task ${taskId}`);
    }
  }

  /**
   * Calculate the delay for retries based on the backoff strategy.
   * @param attempt The current attempt number.
   * @param baseTime The base delay time in milliseconds.
   * @param strategy The backoff strategy ('exponential', 'linear', or 'fixed').
   * @returns The calculated delay time in milliseconds.
   */
  private calculateBackoffDelay(
    attempt: number,
    baseTime: number,
    strategy: 'exponential' | 'linear' | 'fixed',
  ): number {
    const strategies = {
      exponential: () => baseTime * Math.pow(2, attempt - 1),
      linear: () => baseTime * attempt,
      fixed: () => baseTime,
    };

    return strategies[strategy]?.() || baseTime;
  }

  /**
   * Pause execution for a specified duration.
   * @param ms The duration in milliseconds.
   * @returns A promise that resolves after the specified duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
