# Sprint Planning Poker

Monorepo do sprint planning poker do time.

## Stack

| Área    | Tecnologia                                  | Hospedagem |
| ------- | ------------------------------------------- | ---------- |
| Front   | React + TypeScript + Vite + socket.io-client | Vercel    |
| Back    | NestJS + TypeScript + Socket.IO (socket.io)  | Railway   |
| Banco   | Nenhum por enquanto (estado em memória)      | —          |

## Estrutura

```
.
├── client/          # Frontend React + Vite
├── server/          # Backend NestJS + Socket.IO
└── package.json     # Workspaces (yarn) + scripts agregados
```

## Pré-requisitos

- Node.js >= 18
- yarn

## Setup

```bash
# Instalar dependências de todos os workspaces
yarn install
```

## Rodando em dev

```bash
# Roda client e server juntos
yarn dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

O front em dev usa o proxy `/` e `/socket.io` do Vite para conversar com o server,
então não há configuração de CORS/URL extra localmente.

## Scripts

| Comando            | Descrição                         |
| ------------------ | --------------------------------- |
| `yarn dev`         | Roda client + server em watch     |
| `yarn build`       | Builda client e server            |
| `yarn dev:client`  | Roda só o frontend                |
| `yarn dev:server`  | Roda só o backend                 |

## Estado e realtime

O backend mantém o estado das salas **em memória** (no `PokerService`) e
sincroniza os clientes via Socket.IO. Como não há banco:

- Salas/rodadas **não persistem**: reiniciar o server perde tudo.
- O estado é por **instância**: funciona com uma réplica (Railway).
  Horizontal scaling quebraria a sincronização (estado não é compartilhado).
- Sem histórico/retrospectiva por enquanto.

Se no futuro quiserem persistir histórico, basta re-adicionar um banco
(ex.: Prisma + PostgreSQL) e manter o WebSocket para o tempo real.

## Deploy

- **Frontend (Vercel):** importe o repo, root directory `client`, build
  `yarn build`, output `dist`. Defina `VITE_API_URL` para a URL do backend.
- **Backend (Railway):** root directory `server`, start command
  `yarn workspace server start:prod` (ou `node dist/main`), e defina a env
  `PORT`.
