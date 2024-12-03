import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CallbackHelper } from 'src/callback/callback-helper';
import { OnTaskVerifiedOptions } from 'src/interfaces';

/**
 * Decorator for handling task verification with configurable retry logic
 * - Automatically registers event listener
 * - Provides built-in retry mechanism
 * - Logs verification process
 */
export function OnTaskVerified(
  queueName: string,
  options: OnTaskVerifiedOptions = {},
): MethodDecorator {
  const logger = new Logger('OnTaskVerified');

  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const [event] = args;
      const { id: taskId } = event;

      // Validate task ID presence
      if (!taskId) {
        logger.error('Task ID is required for retry logic');
        return;
      }

      // Wrap original method with logging and retry logic
      const callbackFn = async () => {
        logger.log(`Executing task verification for task ${taskId}`);
        return originalMethod.apply(this, args);
      };

      // Execute with configurable retry strategy
      await CallbackHelper.executeWithRetry(callbackFn, taskId, options);
    };

    // Automatically register event listener
    OnEvent(`task.verified.${queueName}`)(target, propertyKey, descriptor);
    return descriptor;
  };
}
