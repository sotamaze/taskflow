export enum TaskFlowStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
}

/**
 * Enum representing the different methods of task flow.
 *
 * @enum {string}
 * @property {string} SMS - Represents the SMS method.
 * @property {string} EMAIL - Represents the Email method.
 * @property {string} SMART_OTP - Represents the Smart OTP method.
 */
export enum TaskFlowMethods {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  SMART_OTP = 'SMART_OTP',
}
