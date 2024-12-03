import { TaskFlowStatus } from 'src/enums';

export interface TaskFlowRecipients {
  email?: string;
  phoneNumber?: string;
  deviceId?: string;
}

export interface AddTaskOptions {
  /**
   * Priority of the task in the queue.
   * Determines the processing order of the task.
   *
   * @default 0
   */
  priority?: number;

  /**
   * Timeout for the task execution when calling the job handler.
   * Specifies the maximum amount of time (in milliseconds) the task can take.
   *
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Time-To-Live (TTL) for the task.
   * Specifies the duration (in milliseconds) the task will remain valid.
   */
  ttl?: number;

  /**
   * Allowed verification methods for the task.
   * Specifies which methods the user can use to complete the verification.
   */
  allowedMethods: Array<'SMS' | 'EMAIL' | 'SMART_OTP'>;

  /**
   * Recipient details for the task.
   * Provides information required for sending notifications.
   * Examples:
   * - `email`: Email address of the recipient.
   * - `phoneNumber`: Phone number of the recipient.
   * - `deviceId`: Device ID for Smart OTP.
   */
  recipient: TaskFlowRecipients;
}

/**
 * Result returned when a task is added to the queue
 * @template T The type of the data payload associated with the task
 */
export interface TaskMetadata<T = any> {
  /**
   * Unique identifier for the task.
   * This ID can be used to track the task's status or retrieve its metadata.
   */
  id: string;

  /**
   * The name of the queue the task was added to.
   * Indicates where the task is stored for processing.
   */
  queue: string;

  /**
   * The payload or input data for the task.
   * The data type can be customized using a generic type `T`.
   */
  data: T;

  /**
   * Status of the task upon creation.
   * Typically, tasks start with a status of 'pending'.
   */
  status: TaskFlowStatus;

  /**
   * The priority of the task within the queue.
   * Determines the order in which the task will be processed relative to others in the same queue.
   *
   * Default is `0` (normal priority).
   */
  priority: number;

  /**
   * Timeout for the task execution, in milliseconds.
   * Specifies the maximum amount of time the task can take
   * to be processed by the job handler before being marked as timed out.
   */
  timeout: number;

  /**
   * Timestamp when the task was added to the queue.
   * Represents the time (in milliseconds since the Unix epoch) when the task was created.
   */
  timestamp: number;

  /**
   * Time-To-Live (TTL) for the task.
   * Specifies the duration (in milliseconds) the task will remain valid.
   */
  ttl?: number;

  /**
   * Recipient details for the task.
   * Provides information required for sending notifications.
   * Examples:
   * - `email`: Email address of the recipient.
   * - `phoneNumber`: Phone number of the recipient.
   * - `deviceId`: Device ID for Smart OTP.
   */
  recipient: TaskFlowRecipients;
}
