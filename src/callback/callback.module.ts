import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TaskEventListenerService } from './task-event-listener.service';

@Module({
  imports: [EventEmitterModule.forRoot({ wildcard: true })],
  providers: [TaskEventListenerService],
  exports: [TaskEventListenerService],
})
export class CallbackModule {}
