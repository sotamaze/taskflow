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

/**
 * Options for configuring the retry mechanism in TaskFlow.
 * These options are used to control the retry logic for task verification.
 */
export interface OnTaskVerifiedOptions {
  /**
   * Maximum number
   * of retry attempts before failing the task verification.
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Backoff strategy for calculating delays between retry attempts.
   * @default 'fixed'
   */
  backoffStrategy?: 'exponential' | 'linear' | 'fixed';

  /**
   * Base time for calculating the delay between retry attempts (in milliseconds).
   * @default 1000
   */
  backoffTime?: number;
}
