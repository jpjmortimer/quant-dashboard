import { Body, Controller, Post } from '@nestjs/common';
import { ComputeRequestDto, ComputeResponseDto } from './dto';

@Controller()
export class ComputeController {
  @Post('/compute')
  compute(@Body() req: ComputeRequestDto): ComputeResponseDto {
    const closes = req.candles.map((c) => c.close);

    if (closes.length === 0) {
      // Mirror sensible behaviour (FastAPI would 500 on closes[-1])
      return {
        count: 0,
        last_close: 0,
        average_close: 0,
      };
    }

    const sum = closes.reduce((acc, v) => acc + v, 0);

    return {
      count: closes.length,
      last_close: closes[closes.length - 1],
      average_close: sum / closes.length,
    };
  }
}
