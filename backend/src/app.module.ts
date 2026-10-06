import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import {
  PASSWORD_HASHER,
  TOKEN_SERVICE,
} from './application/interfaces/auth.interfaces';
import { GetMeUseCase } from './application/use-cases/auth/get-me.use-case';
import { LoginUserUseCase } from './application/use-cases/auth/login-user.use-case';
import { LogoutUserUseCase } from './application/use-cases/auth/logout-user.use-case';
import { RefreshTokenUseCase } from './application/use-cases/auth/refresh-token.use-case';
import { IngestEventUseCase } from './application/use-cases/events/ingest-event.use-case';
import { ListEventsUseCase } from './application/use-cases/events/list-events.use-case';
import {
  AcceptProposalUseCase,
  CreateProposalUseCase,
  DeclineProposalUseCase,
  GetDashboardUseCase,
  GetProposalUseCase,
  ListProposalsUseCase,
  SendProposalUseCase,
  ViewPublicProposalUseCase,
} from './application/use-cases/proposals/proposals.use-case';
import { EVENT_BUS } from './domain/ports/event-bus';
import { EVENT_REPOSITORY } from './domain/repositories/event.repository';
import { PROPOSAL_REPOSITORY } from './domain/repositories/proposal.repository';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository';
import { USER_REPOSITORY } from './domain/repositories/user.repository';
import { BcryptPasswordHasher } from './infrastructure/auth/bcrypt-password.hasher';
import { JwtAuthGuard } from './infrastructure/auth/jwt-auth.guard';
import { JwtTokenService } from './infrastructure/auth/jwt-token.service';
import { JwtStrategy } from './infrastructure/auth/jwt.strategy';
import { PrismaModule } from './infrastructure/database/prisma.module';
import { OutboxEventBus } from './infrastructure/events/outbox-event-bus';
import { PrismaEventRepository } from './infrastructure/repositories/prisma-event.repository';
import { PrismaProposalRepository } from './infrastructure/repositories/prisma-proposal.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/repositories/prisma-refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { AuthController } from './presentation/controllers/auth.controller';
import { EventsController } from './presentation/controllers/events.controller';
import { HealthController } from './presentation/controllers/health.controller';
import { ProposalsController } from './presentation/controllers/proposals.controller';
import { RolesGuard } from './presentation/guards/roles.guard';
import type { EventRepository } from './domain/repositories/event.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
        },
      }),
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    ProposalsController,
    EventsController,
  ],
  providers: [
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    RolesGuard,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    { provide: PROPOSAL_REPOSITORY, useClass: PrismaProposalRepository },
    { provide: EVENT_REPOSITORY, useClass: PrismaEventRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    {
      provide: EVENT_BUS,
      useFactory: (events: EventRepository) => new OutboxEventBus(events),
      inject: [EVENT_REPOSITORY],
    },
    LoginUserUseCase,
    RefreshTokenUseCase,
    LogoutUserUseCase,
    GetMeUseCase,
    CreateProposalUseCase,
    ListProposalsUseCase,
    GetProposalUseCase,
    SendProposalUseCase,
    ViewPublicProposalUseCase,
    AcceptProposalUseCase,
    DeclineProposalUseCase,
    GetDashboardUseCase,
    IngestEventUseCase,
    ListEventsUseCase,
  ],
})
export class AppModule {}
