import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import {
  RegisterRequestDto,
  LoginRequestDto,
  ChangePasswordRequestDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(
    @Headers('x-app-secret') appSecret: string | undefined,
    @Body() body: RegisterRequestDto,
  ) {
    return this.auth.register(appSecret, body);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginRequestDto) {
    return this.auth.login(body);
  }

  // No @Public(): exige el token actual, que además queda invalidado por el
  // cambio — el nuevo token en la respuesta es el único que sigue sirviendo.
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @CurrentUser() userId: string,
    @Body() body: ChangePasswordRequestDto,
  ) {
    return this.auth.changePassword(userId, body);
  }
}
