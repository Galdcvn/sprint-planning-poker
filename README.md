# Sprint Planning Poker

Monorepo do sprint planning poker do time.

## Stack

| Área    | Tecnologia                     | Hospedagem |
| ------- | ------------------------------ | ---------- |
| Front   | React + TypeScript + Vite      | Vercel     |
| Back    | NestJS + TypeScript + Prisma   | Railway    |
| Banco   | PostgreSQL                     | Railway    |

## Estrutura

```
.
├── client/          # Frontend React + Vite
├── server/          # Backend NestJS + Prisma
├── docker-compose.yml   # PostgreSQL local para dev
└── package.json     # Workspaces (yarn) + scripts agregados
```

## Pré-requisitos

- Node.js >= 18
- yarn
- Docker (para o PostgreSQL local)

## Setup

```bash
# 1. Instalar dependências de todos os workspaces
yarn install

# 2. Subir o PostgreSQL local (Docker)
docker compose up -d

# 3. Configurar variáveis de ambiente do server
cp server/.env.example server/.env

# 4. (Primeira vez) Rodar a migration inicial do banco
yarn workspace server prisma:migrate
```

> Nota: o `server/.env` já vem criado com valores padrão locais. Se você
> customizou as credenciais do banco, atualize a `DATABASE_URL`.

## Rodando em dev

```bash
# Roda client e server juntos
yarn dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Scripts

| Comando                  | Descrição                                  |
| ------------------------ | ------------------------------------------ |
| `yarn dev`               | Roda client + server em watch              |
| `yarn build`             | Builda client e server                     |
| `yarn dev:client`        | Roda só o frontend                         |
| `yarn dev:server`        | Roda só o backend                          |
| `yarn workspace server prisma:generate` | Gera o Prisma Client       |
| `yarn workspace server prisma:migrate`  | Cria migration + aplica (dev) |
| `yarn workspace server prisma:deploy`   | Aplica migrations (prod)    |
| `yarn workspace server prisma:studio`   | Abre o Prisma Studio        |

## Database

O schema fica em `server/prisma/schema.prisma`. O provider é `postgresql`.

Em produção (Railway), crie um banco PostgreSQL e defina a env `DATABASE_URL`
apontando para ele, e rode `yarn workspace server prisma:deploy` para aplicar as
migrations.

## Deploy

- **Frontend (Vercel):** importe o repo, root directory `client`, build
  `yarn build`, output `dist`.
- **Backend (Railway):** root directory `server`, start command
  `yarn workspace server start:prod` (ou `node dist/main`), e adicione as envs
  (`DATABASE_URL`, `PORT`).
