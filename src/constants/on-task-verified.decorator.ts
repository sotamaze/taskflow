import { SetMetadata } from '@nestjs/common';
import { ON_TASK_VERIFIED_KEY } from './taskflow.constant';

/**
 * Decorator to register a method to be executed when a task is verified.
 * @param taskName Optional task name to scope the listener.
 */
export function OnTaskVerified(taskName?: string): MethodDecorator {
  return SetMetadata(ON_TASK_VERIFIED_KEY, { taskName });
}
