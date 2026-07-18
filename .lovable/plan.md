# PitStop CS — Plano de Produto

Sistema interno para substituir as planilhas do time de Customer Success no registro de gargalos e atendimentos Neo, com autenticação, papéis (Analista, Coordenador, Admin), dashboards e auditoria.

---

## 1. Arquitetura proposta

- **Frontend**: TanStack Start + React + Tailwind + shadcn (stack atual do projeto).
- **Backend**: Lovable Cloud (Postgres + Auth + RLS + Storage).
- **Autenticação**: e-mail/senha via Lovable Cloud (login obrigatório; sem cadastro público — apenas Admin cria usuários / convida). Sessão persistente, rotas protegidas por `_authenticated`.
- **Autorização**: tabela separada `user_roles` (enum `app_role`: `analista | coordenador | admin`) + função `has_role` SECURITY DEFINER; RLS em todas as tabelas.
- **Dados**: Postgres com RLS. Analista vê só o que é dele; Coordenador vê tudo (leitura + edição); Admin vê tudo + gestão.
- **Auditoria**: tabela `audit_log` alimentada por triggers em INSERT/UPDATE/DELETE das tabelas de negócio.
- **Listas parametrizáveis**: segmento, tipo de gargalo, status, motivo, etc. em tabelas de domínio editáveis pelo Admin (evita hardcode).

```text
[Browser SPA] ── auth ──▶ [Lovable Cloud Auth]
       │
       ├── server fns ──▶ [Postgres + RLS]
       │                       │
       │                       └── triggers ──▶ audit_log
       └── dashboards (queries agregadas com RLS)
```

---

## 2. Modelo de dados (tabelas)

Tabelas de identidade e permissão:
- `profiles` — id (FK auth.users), nome, email, ativo, created_at.
- `app_role` (enum) e `user_roles` — user_id, role.

Tabelas de domínio (editáveis por Admin):
- `segmentos` — id, nome, ativo.
- `tipos_gargalo` — id, nome, ativo.
- `status_gargalo` — id, nome, ordem, ativo.
- `motivos_atendimento` — id, nome, ativo.
- `canais_atendimento` — id, nome, ativo.

Tabelas de negócio:
- `gargalos` — id, analista_id, cliente, segmento_id, tipo_id, status_id, descricao, data_abertura, data_fechamento, prioridade, observacoes, created_at, updated_at.
- `atendimentos_neo` — id, analista_id, cliente, segmento_id, canal_id, motivo_id, data, duracao_min, resultado, observacoes, created_at, updated_at.

Auditoria:
- `audit_log` — id, tabela, registro_id, acao (INSERT/UPDATE/DELETE), autor_id, diff (jsonb), criado_em.

RLS resumida:
- `gargalos` / `atendimentos_neo`:
  - SELECT: `analista_id = auth.uid()` OR `has_role(auth.uid(),'coordenador')` OR `has_role(auth.uid(),'admin')`.
  - INSERT: autenticado, `analista_id = auth.uid()` (analista); coord/admin podem inserir para outros.
  - UPDATE: dono OU coord OU admin.
  - DELETE: admin (a confirmar — ver dúvidas).
- Tabelas de domínio: SELECT autenticado; escrita apenas admin.
- `user_roles`: SELECT autenticado próprio + admin; escrita admin.
- `audit_log`: SELECT admin.

---

## 3. Páginas e componentes

Rotas públicas:
- `/auth` — login.

Rotas autenticadas (`_authenticated/`):
- `/` — redireciona conforme papel.
- `/dashboard` — dashboard do usuário (analista vê o seu; coord/admin vê consolidado, com filtros).
- `/gargalos` — lista + filtros + criar/editar.
- `/gargalos/novo`, `/gargalos/$id`.
- `/atendimentos` — lista + filtros + criar/editar.
- `/atendimentos/novo`, `/atendimentos/$id`.
- `/relatorios` — visões consolidadas (coord/admin).
- `/admin/usuarios` — CRUD de usuários e papéis (admin).
- `/admin/listas` — edição de tabelas de domínio (admin).
- `/admin/auditoria` — histórico (admin).
- `/perfil` — dados pessoais e troca de senha.

Componentes centrais:
- `AppShell` (sidebar + topbar sensível a papel).
- `RoleGuard` para esconder itens de menu.
- `DataTable` com filtros (analista, mês, segmento, status).
- `GargaloForm`, `AtendimentoForm`.
- `KpiCard`, `ChartBar`, `ChartLine`, `ChartPie` (Recharts).
- `AuditTimeline`.
- `UserRoleManager`, `DomainListEditor`.

---

## 4. Fluxos por perfil

**Analista de CS**
1. Login → cai em `/dashboard` pessoal (KPIs do mês, últimos registros).
2. Cria/edita gargalos e atendimentos próprios (formulário padronizado com listas fixas).
3. Vê apenas seus registros em qualquer listagem.
4. Sem acesso a `/admin/*` nem a dados de outros analistas.

**Coordenador**
1. Login → `/dashboard` consolidado com filtros (analista, mês, segmento).
2. Lista todos os registros, pode filtrar e exportar (CSV).
3. Pode editar registros de qualquer analista.
4. Acessa `/relatorios`.
5. Sem acesso a gestão de usuários/listas.

**Administrador**
1. Tudo do Coordenador.
2. `/admin/usuarios`: convida, ativa/desativa, atribui papéis.
3. `/admin/listas`: mantém segmentos, tipos, status, motivos, canais.
4. `/admin/auditoria`: consulta histórico com filtros.

---

## 5. Ordem de implementação sugerida

1. Habilitar Lovable Cloud + auth e-mail/senha + rota `/auth` + `_authenticated`.
2. Tabelas `profiles`, `app_role`, `user_roles`, função `has_role`, trigger de criação de profile.
3. AppShell + navegação sensível a papel + página de perfil.
4. Tabelas de domínio + tela `/admin/listas` (para popular antes do resto).
5. CRUD de `gargalos` com RLS + `/gargalos` e formulário.
6. CRUD de `atendimentos_neo` com RLS + `/atendimentos`.
7. Dashboard do analista (KPIs pessoais).
8. Dashboard consolidado + `/relatorios` para coord/admin.
9. `/admin/usuarios` (gestão de papéis).
10. Auditoria (triggers + `/admin/auditoria`).
11. Exportação CSV e refinamentos.

---

## 6. Riscos e pontos de atenção

- Migração dos dados atuais das planilhas (não descrito no escopo).
- Definir corretamente colunas de gargalos/atendimentos: as planilhas reais devem ditar os campos — ver dúvidas abaixo.
- Volume de auditoria pode crescer rápido; considerar retenção.
- LGPD: dados de clientes exigem controle de acesso rígido (RLS já cobre).
- Sem cadastro público: precisa de fluxo de convite ou criação manual pelo Admin.

---

## 7. Dúvidas antes de implementar

1. **Campos exatos** de "Gargalo" e "Atendimento Neo": você pode compartilhar as colunas atuais das planilhas? Assumi um conjunto mínimo acima.
2. **Migração**: importar histórico das planilhas atuais ou começar do zero?
3. **Cadastro de usuários**: apenas Admin cria (assumido), ou permitir auto-cadastro restrito por domínio de e-mail?
4. **Exclusão de registros**: analista pode excluir os próprios, ou apenas admin?
5. **Exportação CSV**: necessária desde o MVP ou depois?
6. **"Segmento" e demais listas**: você fornece os valores iniciais ou o Admin cadastra tudo depois?
7. **Notificações** (e-mail/in-app) para SLA de gargalos: fazem parte do escopo?
8. **Multi-tenant**: é um único time/empresa ou múltiplas unidades?

Confirma o plano e responde às dúvidas para eu começar a implementação?
