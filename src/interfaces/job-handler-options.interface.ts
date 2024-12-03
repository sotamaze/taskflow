export interface JobHandlerOptions {
  queue: string;
  retry?: number;
  timeout?: number;
}
