import { Module } from '@nestjs/common';
import { ComputeController } from './compute/compute.controller';
import { MetaController } from './meta/meta.controller';

@Module({
  imports: [],
  controllers: [ComputeController, MetaController],
  providers: [],
})
export class AppModule {}
