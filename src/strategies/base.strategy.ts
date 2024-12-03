/* eslint-disable @typescript-eslint/no-unused-vars */

import { TaskMetadata } from 'src/interfaces';

/**
 * Base class for notification strategies.
 * Extend this class to implement custom logic for generating OTP
 * and sending notifications for different verification methods.
 */
export abstract class BaseStrategy {
  /**
   * Generate an OTP for a given task.
   * Override this method in subclasses to provide custom OTP generation logic.
   *
   * @param metadata Task-related data.
   * @returns A generated OTP as a string.
   */
  async generate(metadata: TaskMetadata): Promise<string> {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Default: 6-digit OTP
  }

  /**
   * Send a notification to the user.
   * Override this method in subclasses to provide custom notification logic.
   *
   * @param metadata Task-related data.
   * @param otp The OTP to be included in the notification.
   */
  async send(metadata: TaskMetadata, otp: string): Promise<void> {}
}
