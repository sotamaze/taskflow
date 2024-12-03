import { ON_TASK_VERIFIED_KEY } from '../constants/taskflow.constant';

/**
 * Decorator to register a method to be executed when a task is verified.
 * @param taskName Optional task name to scope the listener.
 */
export const OnTaskVerified = (taskName?: string) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(
      ON_TASK_VERIFIED_KEY,
      { taskName },
      target[propertyKey],
    );
  };
};
