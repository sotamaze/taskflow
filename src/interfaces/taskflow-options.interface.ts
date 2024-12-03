import { RedisModuleOptions } from '@liaoliaots/nestjs-redis';
import { BaseStrategy } from 'src/strategies';

/**
 * Options for configuring the TaskFlow module.
 */
export interface TaskFlowModuleOptions {
  /**
   * Configuration for the Redis module.
   */
  redis: RedisModuleOptions;

  /**
   * Retry policy for task execution.
   */
  retry?: {
    /**
     * Maximum number of retry attempts for a failed task.
     *
     * @default 3
     */
    maxAttempts?: number;

    /**
     * Strategy to use for backoff between retries.
     * - `exponential`: Increases exponentially with each retry.
     * - `linear`: Increases linearly with each retry.
     * - `fixed`: Fixed time between retries.
     *
     * @default 'fixed'
     */
    backoffStrategy?: 'exponential' | 'linear' | 'fixed';

    /**
     * Base time (in milliseconds) to wait between retries.
     *
     * @default 1000
     */
    backoffTime?: number;
  };

  /**
   * Timeout (in milliseconds) for job execution.
   * If a job exceeds this timeout, it will be marked as failed.
   *
   * @default 30000
   */
  jobTimeout?: number;

  /**
   * Strategies for handling different verification methods (e.g., SMS, Email, Smart OTP).
   * Each method should map to a specific strategy instance.
   */
  strategies: {
    [method: string]: BaseStrategy;
  };
}

/**
 * Asynchronous configuration options for the TaskFlow module.
 */
export interface TaskFlowModuleAsyncOptions {
  /**
   * Factory function to asynchronously generate module options.
   */
  useFactory: (
    ...args: any[]
  ) => Promise<TaskFlowModuleOptions> | TaskFlowModuleOptions;

  /**
   * Dependencies to inject into the factory function.
   */
  inject?: any[];
}
