import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AccessTokenPayload } from '../../application/interfaces/auth.interfaces';
import {
  AcceptProposalUseCase,
  CreateProposalUseCase,
  DeclineProposalUseCase,
  GetDashboardUseCase,
  GetProposalUseCase,
  ListProposalsUseCase,
  SendProposalUseCase,
  ViewPublicProposalUseCase,
} from '../../application/use-cases/proposals/proposals.use-case';
import type { ProposalStatus } from '../../domain/entities/proposal.entity';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { CreateProposalDto, DeclineProposalDto } from '../dto/visto.dto';
import { RolesGuard } from '../guards/roles.guard';

@ApiTags('Propostas')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProposalsController {
  constructor(
    private readonly createProposal: CreateProposalUseCase,
    private readonly listProposals: ListProposalsUseCase,
    private readonly getProposal: GetProposalUseCase,
    private readonly sendProposal: SendProposalUseCase,
    private readonly viewPublic: ViewPublicProposalUseCase,
    private readonly acceptProposal: AcceptProposalUseCase,
    private readonly declineProposal: DeclineProposalUseCase,
    private readonly getDashboard: GetDashboardUseCase,
    private readonly config: ConfigService,
  ) {}

  @Get('dashboard')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Caixa por estado',
    description:
      'Contagem e valor por status (rascunho, enviada, vista, aceita, recusada, expirada) e últimos eventos.',
  })
  dashboard() {
    return this.getDashboard.execute();
  }

  @Get('proposals')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar propostas',
    description:
      'Caixa da vendedora. SENT/VIEWED com validUntil no passado aparecem como EXPIRED.',
  })
  list(@Query('status') status?: ProposalStatus) {
    return this.listProposals.execute({ status });
  }

  @Post('proposals')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Criar rascunho',
    description:
      'Cria DRAFT com itens. Enviar exige validade futura. Empresa/owner vêm do JWT.',
  })
  create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateProposalDto,
  ) {
    return this.createProposal.execute({
      clientName: dto.clientName,
      clientEmail: dto.clientEmail,
      message: dto.message,
      validUntil: new Date(dto.validUntil),
      items: dto.items,
      ownerId: user.sub,
    });
  }

  @Get('proposals/:id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Detalhe da proposta',
    description: 'Inclui linha do tempo do outbox e o hash se já foi aceita.',
  })
  detail(@Param('id') id: string) {
    return this.getProposal.execute({ proposalId: id });
  }

  @Post('proposals/:id/send')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Enviar proposta',
    description:
      'Só DRAFT. Gera token opaco, congela o snapshot e publica PropostaEnviada. Link público em /p/:token.',
  })
  send(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.sendProposal.execute({
      proposalId: id,
      actorId: user.sub,
      publicAppUrl: this.config.get<string>('PUBLIC_APP_URL'),
    });
  }

  @Public()
  @Get('p/:token')
  @ApiOperation({
    summary: 'Abrir proposta pública',
    description:
      'Sem login. Incrementa viewCount. Primeira abertura em SENT vira VIEWED e publica PropostaVista. Sem IP nem fingerprint.',
  })
  view(@Param('token') token: string) {
    return this.viewPublic.execute({ token });
  }

  @Public()
  @Post('p/:token/accept')
  @ApiOperation({
    summary: 'Aceitar proposta',
    description:
      'Só SENT/VIEWED e dentro da validade. Grava contentHash SHA-256 do JSON canônico e publica PropostaAceita com handoff ao VendaCore. Segunda decisão falha.',
  })
  accept(@Param('token') token: string) {
    return this.acceptProposal.execute({ token });
  }

  @Public()
  @Post('p/:token/decline')
  @ApiOperation({
    summary: 'Recusar proposta',
    description:
      'Só SENT/VIEWED e dentro da validade. Segunda decisão no mesmo token falha.',
  })
  decline(@Param('token') token: string, @Body() dto: DeclineProposalDto) {
    return this.declineProposal.execute({ token, reason: dto.reason });
  }
}
