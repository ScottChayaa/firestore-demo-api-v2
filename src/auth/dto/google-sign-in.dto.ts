import { IsString } from 'class-validator';

export class GoogleSignInDto {
  @IsString({ message: 'ID Token 必須是字串' })
  idToken: string;

  @IsString({ message: 'Refresh Token 必須是字串' })
  refreshToken: string;
}
