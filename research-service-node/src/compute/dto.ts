import { IsArray, IsInt, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CandleDto {
  @IsInt()
  time!: number;

  @IsNumber()
  open!: number;

  @IsNumber()
  high!: number;

  @IsNumber()
  low!: number;

  @IsNumber()
  close!: number;

  @IsNumber()
  volume!: number;
}

export class ComputeRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandleDto)
  candles!: CandleDto[];
}

export class ComputeResponseDto {
  count!: number;
  last_close!: number;
  average_close!: number;
}
