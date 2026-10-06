import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IngestEventUseCase } from '../../application/use-cases/events/ingest-event.use-case';
import { ListEventsUseCase } from '../../application/use-cases/events/list-events.use-case';
import type { EventType } from '../../domain/entities/domain-event.entity';
import { UnauthorizedError } from '../../domain/errors/domain-error';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/repositories/user.repository';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { IngestEventDto } from '../dto/visto.dto';
import { RolesGuard } from '../guards/roles.guard';

@ApiTags('Eventos')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(
    private readonly ingestEvent: IngestEventUseCase,
    private readonly listEvents: ListEventsUseCase,
    private readonly config: ConfigService,
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepository,
  ) {}

  @Get('events')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Linha do tempo do bus',
    description:
      'Outbox de eventos do Visto. Filtros: type, sourceApp, aggregateId, correlationId.',
  })
  list(
    @Query('type') type?: EventType,
    @Query('sourceApp') sourceApp?: string,
    @Query('aggregateId') aggregateId?: string,
    @Query('correlationId') correlationId?: string,
  ) {
    return this.listEvents.execute({
      type,
      sourceApp,
      aggregateId,
      correlationId,
    });
  }

  @Public()
  @Post('events/ingest')
  @ApiHeader({ name: 'x-ingest-secret', required: true })
  @ApiOperation({
    summary: 'Ingerir evento da suíte',
    description:
      'Header x-ingest-secret. PropostaEnviada do Nexo vira proposta SENT. Idempotency-Key evita duplicata.',
  })
  async ingest(
    @Headers('x-ingest-secret') secret: string | undefined,
    @Body() dto: IngestEventDto,
  ) {
    const expected = this.config.get<string>('INGEST_SECRET');
    if (!expected || secret !== expected) {
      throw new UnauthorizedError('Ingest secret inválido');
    }
    const owner =
      (await this.users.findByEmail('marina@visto.dev')) ??
      (await this.users.list())[0];
    if (!owner) {
      throw new UnauthorizedError('Nenhum vendedor para atribuir a proposta');
    }
    return this.ingestEvent.execute({
      ...dto,
      defaultOwnerId: owner.id,
    });
  }
}
