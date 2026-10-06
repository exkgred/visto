# Visto

Proposta pública com aceite. O Nexo envia; o cliente abre o link, lê e lacra. O handoff aponta para o VendaCore.

Backend em NestJS (Clean Architecture), frontend em React + Vite, PostgreSQL e Prisma.

---

## O que o produto faz

- Rascunho com itens, cliente e validade
- Envio gera token opaco e congela o snapshot
- Página pública (`/p/:token`) — papel, sem login
- Aceite grava `contentHash` (SHA-256 do JSON canônico) e trava o conteúdo
- Recusa, expiração e segunda decisão no mesmo token falham
- Ingest de `PropostaEnviada` (Nexo) vira proposta `SENT`, idempotente pela chave
- Aceite publica `PropostaAceita` com handoff `{ system: vendacore, action: criarClienteEOrcamento }`
- PDF = a própria página, com CSS de impressão
- Demo na Vercel com API mockada no `localStorage`

Fluxo contado no recrutamento:

```text
Nexo
  → PropostaEnviada
    → Visto (link público)
      → cliente aceita (hash travado)
        → PropostaAceita
          → VendaCore (criarClienteEOrcamento)
```

Estados: `DRAFT` → `SENT` → `VIEWED` → `ACCEPTED` | `DECLINED`. `EXPIRED` quando `validUntil` passou.

“Aberta” é só `viewedAt` + `viewCount`. Sem IP, fingerprint ou sessão de rastreamento.

---

## Arquitetura

```text
Controller (presentation)
  → Use Case (application)
    → Port / repository (domain)
      → Prisma repository (infrastructure)
EventBus = outbox (grava DomainEvent e marca PUBLISHED)
```

---

## Tecnologias

- **Backend:** Node.js 20, NestJS 10, TypeScript strict, Prisma, PostgreSQL 16, Passport JWT, Jest
- **Frontend:** React 18, Vite, Tailwind, Zustand, Axios
- **Demo:** Vercel estática com `VITE_DEMO=true`

---

## Como rodar

Pré-requisitos: Node.js ≥ 20, Docker Compose, npm.

### 1. Postgres

Na raiz `visto/`:

```bash
docker compose up -d postgres
```

Porta **5439**.

### 2. Backend (porta 3007)

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run start:dev
```

- API: http://localhost:3007/api/v1
- Health: http://localhost:3007/api/v1/health
- Swagger: http://localhost:3007/api/docs

### 3. Frontend (porta 5178)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: http://localhost:5178

Link público da seed: http://localhost:5178/p/demo-sent-acme

### Contas seed

| Email | Senha | Papel |
|-------|-------|-------|
| marina@visto.dev | password123 | SELLER |
| admin@visto.dev | password123 | ADMIN |

Ingest de eventos: header `x-ingest-secret: visto-ingest-dev`.

## Demo na Vercel (estática)

O frontend sobe sozinho, sem Nest/Postgres. Com `VITE_DEMO=true` o Axios usa um adapter no navegador (propostas, aceite, ingest e outbox no `localStorage`).

1. No [Vercel](https://vercel.com/new) importe [exkgred/visto](https://github.com/exkgred/visto)
2. Preset **Services**: deixe só o serviço `frontend` (Vite, pasta `frontend/`). Não adicione o Nest.
3. Se a tela pedir `vercel.json`, use o da raiz (já declara só o frontend)
4. Variável: `VITE_DEMO=true` (já vem em `frontend/.env.production`)
5. Depois do deploy, troque a URL do card no Átrio pela URL da Vercel

Login da demo: `marina@visto.dev` / `password123`.

Página pública da seed: `/p/demo-sent-acme`.

## Testes

```bash
cd backend
npm test
npm run test:cov
npm run lint
```
