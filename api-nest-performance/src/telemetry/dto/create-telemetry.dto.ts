import { IsString, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';

export class CreateTelemetryDto {
  @IsString()
  @IsNotEmpty({ message: 'O ID do sensor é obrigatório' })
  sensorId: string;

  @IsString()
  @IsNotEmpty({ message: 'A chave de API é obrigatória' })
  apiKey: string;

  @IsNumber()
  @IsPositive({ message: 'O valor deve ser maior que zero' })
  value: number;

  @IsString()
  @IsNotEmpty({ message: 'A unidade de medida é obrigatória' })
  unit: string;
}