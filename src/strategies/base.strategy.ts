import { Injectable } from '@nestjs/common';
import { TaskMetadata } from 'src/interfaces';

@Injectable()
export abstract class BaseStrategy {
  /**
   * Generate an OTP for a given task.
   */
  abstract generate(metadata: TaskMetadata): Promise<string>;

  /**
   * Send a notification to the user.
   */
  abstract send(metadata: TaskMetadata, otp: string): Promise<void>;
}
