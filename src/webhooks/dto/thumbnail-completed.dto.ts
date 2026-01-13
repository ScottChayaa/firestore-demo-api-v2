import {
  IsString,
  IsObject,
  IsEnum,
  IsDateString,
  IsOptional,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class ThumbnailInfoDto {
  @IsString()
  url: string;

  @IsString()
  filePath: string;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsNumber()
  fileSize: number;

  @IsString()
  format: string;
}

class ThumbnailsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ThumbnailInfoDto)
  small?: ThumbnailInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ThumbnailInfoDto)
  medium?: ThumbnailInfoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ThumbnailInfoDto)
  large?: ThumbnailInfoDto;
}

export class ThumbnailCompletedDto {
  @IsString()
  fileId: string;

  @IsString()
  filePath: string;

  @IsObject()
  @ValidateNested()
  @Type(() => ThumbnailsDto)
  thumbnails: ThumbnailsDto;

  @IsEnum(['completed', 'failed'])
  status: 'completed' | 'failed';

  @IsOptional()
  @IsString()
  error?: string;

  @IsDateString()
  generatedAt: string;
}
