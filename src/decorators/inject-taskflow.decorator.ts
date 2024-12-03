import { Inject } from '@nestjs/common';
import { TaskFlowService } from 'src/taskflow.service';

/**
 * Custom decorator to inject TaskFlowService into a class or method
 *
 * Example usage:
 * @InjectTaskFlowService() private readonly taskFlowService: TaskFlowService;
 */
export const InjectTaskFlow = () => Inject(TaskFlowService);
