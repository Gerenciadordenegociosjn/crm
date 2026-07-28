# PRD — Mapey CRM
**Produto:** Mapey CRM — Gestão de Pipeline de Locação de Contas de Anúncio  
**Versão:** 1.0  
**Data:** Julho 2026  
**Público-alvo deste documento:** Equipe de Tecnologia

---

## 1. Visão Geral do Produto

O Mapey CRM é uma plataforma web interna de gestão de pipeline comercial voltada para empresas que operam com **locação de contas de anúncio** (Meta Ads, Google Ads, TikTok Ads, etc.). O sistema centraliza o acompanhamento de oportunidades de venda, gestão de clientes, inventário de contas de anúncio e relatórios mensais de performance.

### Objetivos
- Dar visibilidade completa do funil comercial em tempo real.
- Controlar o ciclo de vida de cada locação: desde a captação do lead até o encerramento/churn.
- Registrar o histórico de atividades por negócio.
- Medir indicadores-chave: taxa de churn, ticket médio, receita ativa mensal.

---

## 2. Usuários e Papéis

| Papel | Descrição | Restrições |
|---|---|---|
| **Admin** | Acesso total ao sistema, incluindo gestão de usuários | Nenhuma |
| **Sales (Vendedor)** | Acesso às funcionalidades de CRM | Sem acesso à área administrativa |

A autenticação é feita via e-mail e senha. Tokens JWT são emitidos no login e mantidos em memória pelo cliente.

---

## 3. Arquitetura Técnica

### Stack
| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS + shadcn/ui |
| Backend | Node.js 24 + Express 5 + TypeScript |
| Banco de Dados | PostgreSQL + Drizzle ORM |
| Contratos de API | OpenAPI 3.0 → Orval (codegen) → React Query + Zod |
| Drag-and-drop | @hello-pangea/dnd |
| Gráficos | Recharts |
| Roteamento | Wouter |

### Estrutura de Repositório (Monorepo pnpm)
```
/
├── artifacts/
│   ├── crm-pipeline/       # Frontend React
│   └── api-server/         # Backend Express
├── lib/
│   ├── db/                 # Schema Drizzle + migrations
│   ├── api-spec/           # openapi.yaml (fonte da verdade)
│   ├── api-client-react/   # Hooks React Query (gerados)
│   └── api-zod/            # Schemas Zod (gerados)
└── docs/
    └── PRD-Mapey-CRM.md    # Este documento
```

---

## 4. Modelo de Dados

### 4.1 `users`
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Chave primária |
| name | string | Nome do usuário |
| email | string | E-mail (único) |
| password_hash | string | Hash bcrypt da senha |
| role | enum | `admin` \| `sales` |
| active | boolean | Se o usuário está ativo |

### 4.2 `clients`
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Chave primária |
| name | string | Nome da empresa/cliente |
| type | string | Tipo de cliente |
| phone | string | Telefone |
| email | string | E-mail |
| document | string | CPF/CNPJ |
| assigned_sales_id | UUID (FK) | Vendedor responsável |

### 4.3 `deals` (negócios/oportunidades)
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Chave primária |
| title | string | Título do negócio |
| client_id | UUID (FK) | Cliente associado |
| owner_id | UUID (FK) | Vendedor responsável |
| stage | enum | Estágio atual no funil |
| estimated_value | decimal | Valor estimado da locação |
| payment_frequency | enum | `daily` \| `weekly` \| `biweekly` \| `monthly` |
| platform | string | Plataforma (Meta, Google, TikTok…) |
| niche | string | Nicho de mercado |
| risk_level | string | Nível de risco |
| lead_source | string | Origem do lead |
| active_month | date | Mês em que entrou como Ativo |
| churn_month | date | Mês em que entrou como Encerrado |
| block_history | text | Histórico de bloqueios de conta |

### 4.4 `ad_accounts` (contas de anúncio)
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Chave primária |
| client_id | UUID (FK) | Cliente ao qual pertence |
| platform | string | Plataforma |
| account_identifier | string | ID da conta na plataforma |
| monthly_limit | decimal | Limite mensal de gasto |
| rental_period_type | string | Tipo de período de locação |
| status | enum | `active` \| `blocked` \| `inactive` |

### 4.5 `activities` (linha do tempo)
| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | Chave primária |
| deal_id | UUID (FK) | Negócio associado |
| user_id | UUID (FK) | Usuário que gerou a atividade |
| type | enum | `note` \| `stage_change` |
| description | text | Conteúdo da nota ou descrição da mudança |
| created_at | timestamp | Data/hora |

---

## 5. Funcionalidades do Sistema

---

### 5.1 Autenticação

**Rota:** `/login`

#### Fluxo
1. Usuário insere e-mail e senha.
2. `POST /api/auth/login` valida as credenciais.
3. Backend retorna JWT + objeto do usuário.
4. Frontend armazena em `AuthContext` e redireciona para o pipeline.
5. `GET /api/auth/me` valida a sessão em recarregamentos.
6. `POST /api/auth/logout` encerra a sessão.

#### Regras de acesso
- Rotas protegidas exigem token válido — usuários não autenticados são redirecionados para `/login`.
- Rotas administrativas (`/admin/*`) exigem `role = admin` — vendedores são redirecionados para o pipeline.

---

### 5.2 Pipeline (Kanban)

**Rota:** `/`

#### Descrição
Visão principal do funil comercial em formato Kanban. Cada card representa um negócio; colunas representam os estágios do processo.

#### Estágios do funil (em ordem)
1. Lead Captado
2. Qualificação
3. Proposta
4. Negociação
5. Fechamento
6. Onboarding
7. Ativo
8. Renovação
9. Encerrado

#### Funcionalidades
| Funcionalidade | Detalhe |
|---|---|
| **Arrastar e soltar** | Mover cards entre colunas atualiza o `stage` do deal via `PATCH /api/deals/:id` |
| **Busca** | Filtra cards por nome do negócio ou nome do cliente em tempo real |
| **Navegador de período** | Seleciona semana, mês ou ano; filtra deals pelo período relevante |
| **KPIs no cabeçalho** | Total de deals e valor estimado total do período selecionado |
| **Abrir deal** | Clicar em um card navega para `/deals/:id` |

#### API
- `GET /api/dashboard/pipeline?start_date=&end_date=` — retorna deals agrupados por estágio.

---

### 5.3 Pipeline Mensal

**Rota:** `/pipeline-mensal`

#### Descrição
Visão gerencial mensal focada em retenção e churn. Permite acompanhar a saúde da base ativa mês a mês.

#### KPIs exibidos
| KPI | Cálculo |
|---|---|
| Total Ativos no Mês | Deals com `active_month` = mês selecionado |
| Total Churn | Deals com `churn_month` = mês selecionado |
| Taxa de Churn | (Churn / Ativos) × 100 |
| Ticket Médio | Soma dos valores / total de ativos |

#### Funcionalidades
| Funcionalidade | Detalhe |
|---|---|
| **Seletor de mês** | Dropdown com os últimos 12 meses |
| **Tabela Clientes Ativos** | Lista deals ativos no mês com cliente, valor e vendedor |
| **Tabela Churn no Mês** | Lista deals encerrados no mês com cliente, valor e motivo |

#### API
- `GET /api/dashboard/pipeline?start_date=&end_date=` — reutiliza o endpoint de pipeline com range de datas do mês.

---

### 5.4 Detalhe do Negócio (Deal)

**Rota:** `/deals/:id`

#### Descrição
Tela central de gestão de uma oportunidade individual. Consolida dados, histórico e ações em um único lugar.

#### Seções da tela

**Formulário de edição**
| Campo | Tipo | Opções |
|---|---|---|
| Título | Texto livre | — |
| Estágio | Select | Os 9 estágios do funil |
| Valor Estimado | Numérico | — |
| Frequência de Pagamento | Select | Diário, Semanal, Quinzenal, Mensal |
| Plataforma | Select | Meta, Google, TikTok, etc. |
| Nicho | Texto livre | — |
| Nível de Risco | Select | — |
| Origem do Lead | Select | — |

**Histórico de Bloqueios**
- Toggle liga/desliga a flag de bloqueio.
- Textarea para descrever o histórico do bloqueio.

**Linha do Tempo de Atividades**
- Lista cronológica reversa de notas e mudanças de estágio.
- Campo para adicionar nova nota + botão "Registrar".
- Mudanças de estágio são registradas automaticamente pelo sistema.

#### API
- `GET /api/deals/:id` — carrega o deal.
- `PATCH /api/deals/:id` — salva edições.
- `GET /api/deals/:id/activities` — carrega a timeline.
- `POST /api/deals/:id/activities` — registra nova nota.

---

### 5.5 Clientes

**Rota index:** `/clients`  
**Rota detalhe:** `/clients/:id`

#### Tela Index
| Funcionalidade | Detalhe |
|---|---|
| **Listagem** | Tabela paginada com nome, documento, e-mail, telefone e vendedor responsável |
| **Busca** | Filtra por nome do cliente |
| **Filtro por vendedor** | Select com todos os sales reps |
| **Novo Cliente** | Modal com formulário: nome, tipo, telefone, e-mail, documento, vendedor responsável |

#### Tela Detalhe
| Seção | Detalhe |
|---|---|
| **Edição de perfil** | Todos os campos do cliente editáveis |
| **Deals associados** | Lista de negócios vinculados com link para o detalhe |
| **Contas de anúncio** | Lista de contas vinculadas com platform, status e limite |

#### API
- `GET /api/clients` — lista clientes (suporta filtro `assigned_sales_id`).
- `POST /api/clients` — cria novo cliente.
- `GET /api/clients/:id` — carrega detalhe.
- `PATCH /api/clients/:id` — salva edições.

---

### 5.6 Contas de Anúncio

**Rota:** `/ad-accounts`

#### Descrição
Inventário de todas as contas de anúncio disponíveis/locadas, independentemente do cliente.

#### Funcionalidades
| Funcionalidade | Detalhe |
|---|---|
| **Listagem** | Tabela com plataforma, identificador, cliente, limite mensal, status |
| **Filtro por plataforma** | Select multi-plataforma |
| **Filtro por status** | Ativo / Bloqueado / Inativo |
| **Nova Conta** | Modal com campos: plataforma, identificador, cliente, limite mensal, período de locação, status |

#### API
- `GET /api/ad-accounts` — lista contas (suporta filtros `platform`, `status`).
- `POST /api/ad-accounts` — cria nova conta.
- `PATCH /api/ad-accounts/:id` — atualiza conta.

---

### 5.7 Administração — Usuários

**Rota:** `/admin/users`  
**Acesso:** Somente `role = admin`

#### Funcionalidades
| Funcionalidade | Detalhe |
|---|---|
| **Listagem** | Tabela com nome, e-mail, papel e status (ativo/inativo) |
| **Badge de papel** | Admin (destaque) / Sales |
| **Novo Usuário** | Modal com campos: nome, e-mail, senha, papel |
| **Ativar/Desativar** | Toggle de status do usuário |

#### API
- `GET /api/users` — lista usuários.
- `POST /api/users` — cria usuário.
- `PATCH /api/users/:id` — atualiza usuário.

---

## 6. Integrações Externas

### 6.1 Webhook WhatsApp — Criação de Lead

**Endpoint:** `POST /api/integrations/whatsapp/leads`  
**Autenticação:** Header `X-Integration-Key`

Permite que ferramentas externas (ex.: bots de WhatsApp) criem leads diretamente no pipeline sem acesso ao frontend.

**Payload esperado:**
```json
{
  "clientName": "string",
  "phone": "string",
  "platform": "string",
  "estimatedValue": 0
}
```

**Comportamento:** Cria um `client` (se não existir) e um `deal` no estágio `Lead Captado`.

---

### 6.2 Webhook WhatsApp — Atualização de Estágio

**Endpoint:** `POST /api/integrations/whatsapp/deals/update-stage`  
**Autenticação:** Header `X-Integration-Key`

Permite atualizar o estágio de um deal remotamente.

**Payload esperado:**
```json
{
  "dealId": "uuid",
  "stage": "string"
}
```

---

## 7. Endpoints da API (Resumo)

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Login | Pública |
| GET | `/api/auth/me` | Valida sessão | JWT |
| POST | `/api/auth/logout` | Logout | JWT |
| GET | `/api/clients` | Lista clientes | JWT |
| POST | `/api/clients` | Cria cliente | JWT |
| GET | `/api/clients/:id` | Detalhe do cliente | JWT |
| PATCH | `/api/clients/:id` | Atualiza cliente | JWT |
| GET | `/api/deals` | Lista deals | JWT |
| POST | `/api/deals` | Cria deal | JWT |
| GET | `/api/deals/:id` | Detalhe do deal | JWT |
| PATCH | `/api/deals/:id` | Atualiza deal | JWT |
| GET | `/api/deals/:id/activities` | Timeline do deal | JWT |
| POST | `/api/deals/:id/activities` | Registra nota | JWT |
| GET | `/api/ad-accounts` | Lista contas | JWT |
| POST | `/api/ad-accounts` | Cria conta | JWT |
| PATCH | `/api/ad-accounts/:id` | Atualiza conta | JWT |
| GET | `/api/users` | Lista usuários | JWT (admin) |
| POST | `/api/users` | Cria usuário | JWT (admin) |
| PATCH | `/api/users/:id` | Atualiza usuário | JWT (admin) |
| GET | `/api/dashboard/pipeline` | Dados do Kanban | JWT |
| GET | `/api/dashboard/summary` | KPIs gerais | JWT |
| POST | `/api/integrations/whatsapp/leads` | Criar lead via webhook | Integration Key |
| POST | `/api/integrations/whatsapp/deals/update-stage` | Atualizar estágio via webhook | Integration Key |

---

## 8. Regras de Negócio

| Regra | Detalhe |
|---|---|
| **`active_month`** | Preenchido automaticamente quando um deal move para o estágio `Ativo` |
| **`churn_month`** | Preenchido automaticamente quando um deal move para o estágio `Encerrado` |
| **Cálculo de Churn Rate** | `(deals encerrados no mês / deals ativos no mês) × 100` |
| **Mudança de estágio gera atividade** | Toda movimentação no Kanban ou no formulário cria um registro de `stage_change` na timeline |
| **Vendedor só vê seus deals** | Filtros padrão aplicam `owner_id = current_user.id` para usuários `sales` (admin vê tudo) |
| **Integration Key** | Chave separada de JWT, configurada via variável de ambiente, para uso exclusivo de webhooks externos |

---

## 9. Navegação (Sidebar)

| Item | Rota | Papel |
|---|---|---|
| Pipeline | `/` | Todos |
| Pipeline Mensal | `/pipeline-mensal` | Todos |
| Clientes | `/clients` | Todos |
| Contas de Anúncio | `/ad-accounts` | Todos |
| Usuários | `/admin/users` | Admin |

---

## 10. Funcionalidades Previstas (Backlog)

As seguintes funcionalidades foram planejadas e estão pendentes de implementação:

| # | Funcionalidade | Prioridade |
|---|---|---|
| 1 | Filtrar o Kanban por vendedor responsável | Alta |
| 2 | Tratamento de erro quando um deal está em estágio sem correspondência no Kanban | Média |

---

## 11. Credenciais de Ambiente (Desenvolvimento)

| Usuário | E-mail | Senha | Papel |
|---|---|---|---|
| Admin | admin@crm.com | admin123 | Admin |
| Carlos | carlos@crm.com | sales123 | Sales |
| Ana | ana@crm.com | sales123 | Sales |

> ⚠️ **Trocar todas as senhas antes de qualquer deploy em produção.**

---

## 12. Variáveis de Ambiente Necessárias

| Variável | Onde usar | Descrição |
|---|---|---|
| `DATABASE_URL` | API Server | String de conexão PostgreSQL |
| `SESSION_SECRET` | API Server | Segredo para assinatura de JWT |
| `INTEGRATION_KEY` | API Server | Chave de autenticação dos webhooks |
| `PORT` | Ambos | Porta do servidor (gerenciada pelo Replit) |

---

*Documento gerado em Julho 2026. Para atualizar, edite `docs/PRD-Mapey-CRM.md` no repositório.*
