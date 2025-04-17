import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';

import { ServerConfig } from '../../../config/server.config';
import { Public } from '../../../decorators/public.decorator';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login-dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendForgotPasswordEmailDto } from './dto/send-forgot-password-email.dto';
import { SendVerificationEmailDto } from './dto/send-verification-email.dto';
import { StandardLoginDto } from './dto/standard-login.dto';
import { ValidateEmailVerificationTokenDto } from './dto/validate-email-verification-token.dto';
import { VerifyTokenDto } from './dto/verify-tokens-dto';

@Controller('auth')
@ApiTags('Auth')
@Public()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
    private readonly workspaceService: WorkspacesService,
  ) {}

  /**
   * Standard login with email and password.
   * Provides the user with access and refresh tokens.
   */
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @Post('login')
  async standardLogin(@Body() body: StandardLoginDto) {
    const user = await this.authService.retrieveValidUserByEmailAndPassword(
      body.email,
      body.password,
    );

    return await this.authService.generateTokens(user);
  }

  /**
   * Login with Google access token.
   * This will create a new user if the user does not exist.
   * Provides the user with access and refresh tokens.
   */
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @Post('login-with-google')
  async googleLogin(@Body() body: GoogleLoginDto, @Res() res: Response) {
    const user = await this.authService.findOrCreateUserByGoogleToken({
      data: body,
    });

    const tokens = await this.authService.generateTokens(user);
    const hiddenToken = await this.authService.generateHiddenTokens(tokens);

    return res.redirect(
      `${ServerConfig.CLIENT_URL}/verify-token?token=${hiddenToken}`,
    );
  }

  /**
   * Logging in with google returns a hidden token on the redirect.
   * The client then needs to send that hidden token for access and refresh tokens.
   */
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @Post('login-with-token')
  async loginWithToken(@Body() body: VerifyTokenDto) {
    const decodedToken = await this.authService.decodeToken(body.token);

    const { access_token, refresh_token } = decodedToken;

    if (!access_token || !refresh_token) {
      throw new BadRequestException('Invalid token');
    }

    return {
      access_token,
      refresh_token,
    };
  }

  /**
   * Standard sign up with email and password.
   * Sends an email with a link to verify the email.
   * The client will need to use the token in the link to fetch
   * the access and refresh tokens.
   */
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @Post('signup')
  async standardSignup(@Body() body: CreateUserDto) {
    const user = await this.userService.create({
      data: body,
      forceVerifyEmail:
        ServerConfig.ENVIRONMENT === 'development' ||
        ServerConfig.SKIP_EMAIL_VERIFICATION,
    });

    await this.workspaceService.create({
      createdByUserId: user.id,
      defaultCreatedWorkspace: true,
      data: {
        name: 'Personal Workspace',
      },
    });

    if (
      ServerConfig.ENVIRONMENT === 'development' ||
      ServerConfig.SKIP_EMAIL_VERIFICATION
    ) {
      return { result: true, verified: true };
    } else {
      return {
        result: this.authService.sendVerificationEmail({ userId: user.id }),
        verified: false,
      };
    }
  }

  /**
   * Refreshes access token using a refresh token
   */
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @Post('refresh-token')
  async refreshAccessToken(@Body() data: RefreshTokenDto) {
    return await this.authService.refreshAccessToken(data.refreshToken);
  }

  /**
   * Sends an email with a verification token (6 digits)
   */
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @Post('resend-email-verification')
  async sendVerificationEmail(@Body() body: SendVerificationEmailDto) {
    const user = await this.authService.retrieveValidUserByEmail(
      body.email,
      false,
    );

    return this.authService.sendVerificationEmail({ userId: user.id });
  }

  /**
   * Verifies the email verification token
   */
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @Post('validate-email-verification-token')
  async validateVerificationToken(
    @Body() body: ValidateEmailVerificationTokenDto,
  ) {
    const user = await this.authService.validateVerificationToken({
      token: body.token,
      email: body.email,
    });

    const tokens = await this.authService.generateTokens(user);
    return this.authService.generateHiddenTokens(tokens);
  }

  /**
   * Sends a forgot password email with a link to reset the password
   */
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @Post('send-forgot-password-email')
  async sendForgotPasswordEmail(@Body() body: SendForgotPasswordEmailDto) {
    return this.authService.sendForgotPasswordEmail(body.email);
  }

  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword({
      token: body.token,
      password: body.password,
    });
  }
}
