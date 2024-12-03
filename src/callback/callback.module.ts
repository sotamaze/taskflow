import { Module } from '@nestjs/common';
import { CallbackService } from './callback.service';
import { TaskEventListenerService } from './task-event-listener.service';

@Module({
  providers: [CallbackService, TaskEventListenerService],
  exports: [CallbackService, TaskEventListenerService],
})
export class CallbackModule {}
