# 🚀 Guia de Instalação / Remix da Plataforma de Rifas

Este documento contém **tudo** que é necessário para colocar a plataforma no ar em um
novo domínio, seja reutilizando o banco externo atual ou criando um banco novo do zero.

> Entregue este arquivo para o próximo chat/desenvolvedor. Ele é auto-suficiente.

---

## 1. Visão geral da arquitetura

| Camada | Onde roda | Observação |
|---|---|---|
| Frontend | Vite + React + TypeScript + Tailwind + shadcn/ui | SPA |
| Banco de dados + Auth + Storage | **Supabase externo** (projeto próprio do cliente) | RLS ativo, multi-tenant |
| Edge Functions | Projeto Supabase do Lovable | Leem/gravam no banco externo via secrets `EXTERNAL_SUPABASE_*` |

### Como o app aponta para o banco externo

O cliente Supabase gerado automaticamente é **substituído por alias** no `vite.config.ts`:

```ts
// vite.config.ts
resolve: {
  alias: [
    {
      find: /^@\/integrations\/supabase\/client$/,
      replacement: path.resolve(__dirname, "./src/integrations/supabase/external-client.ts"),
    },
    { find: "@", replacement: path.resolve(__dirname, "./src") },
  ],
},
```

E o arquivo `src/integrations/supabase/external-client.ts` contém:

```ts
export const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_XXXXXXXX";

// As Edge Functions continuam no projeto Lovable:
export const FUNCTIONS_URL = "https://PROJETO-LOVABLE.supabase.co/functions/v1";
```

👉 **Para trocar de banco, basta alterar essas 3 constantes.** Nada mais no frontend precisa mudar.

---

## 2. Dados que você precisa ter em mãos

### 2.1 Do projeto Supabase (banco de dados)

| Item | Onde encontrar | Público? |
|---|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL | ✅ público |
| `PUBLISHABLE_KEY` (`sb_publishable_...`) | Project Settings → API Keys | ✅ público |
| `SERVICE_ROLE / SECRET KEY` (`sb_secret_...`) | Project Settings → API Keys | 🔴 **SECRETO** |
| Senha do banco | Project Settings → Database | 🔴 **SECRETO** |

⚠️ **NUNCA** cole a service_role key em chat, código ou no `.env` do frontend.
Ela só vai nos **secrets das Edge Functions**.

### 2.2 Secrets das Edge Functions (lado servidor)

Configure na plataforma (Lovable → Secrets) **antes** de testar pagamentos:

| Secret | Obrigatório | Descrição |
|---|---|---|
| `EXTERNAL_SUPABASE_URL` | ✅ | URL do banco externo |
| `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` | ✅ | Secret key do banco externo |
| `EXTERNAL_SUPABASE_ANON_KEY` | ✅ | Publishable/anon key do banco externo |
| `MERCADO_PAGO_ACCESS_TOKEN` | ✅ (se usar MP) | Token privado do Mercado Pago |
| `MERCADO_PAGO_PUBLIC_KEY` | opcional | Chave pública do MP |
| `STRIPE_SECRET_KEY` | opcional | `sk_live_...` / `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | opcional | `pk_live_...` / `pk_test_...` |
| `QUEUE_SECRET` | ✅ | Protege o endpoint `process-webhook-queue` (gere: `openssl rand -hex 32`) |

### 2.3 Configurações públicas (ficam em `site_settings`, no banco)

Nome do site, logo, cores, WhatsApp, chave PIX manual, % de cashback, % de comissão de afiliados, etc.
São populadas pelo `seed-site-settings.sql` e editáveis no painel admin.

---

## 3. Passo a passo da instalação (banco NOVO)

### Passo 1 — Criar o projeto Supabase
1. Crie um novo projeto em supabase.com.
2. Anote URL, publishable key e secret key.

### Passo 2 — Rodar os SQLs (nesta ordem, no SQL Editor)

| Ordem | Arquivo | O que faz |
|---|---|---|
| 1️⃣ | `schema-completo.sql` | Cria **todas** as tabelas, enums, funções, triggers, RLS, GRANTs e buckets de storage |
| 2️⃣ | `setup-storage.sql` | (Já incluso no anterior) Buckets `campaigns`, `site-assets`, `avatars`, `payment-proofs` + policies |
| 3️⃣ | `seed-site-settings.sql` | ~90 chaves de configuração do site (tema, menu, pagamentos, SEO) |
| 4️⃣ | `seed-campanhas.sql` | 2 campanhas demo (Hilux + Lancha), combos, cotas premiadas, comunicados |
| 5️⃣ | `fix-user-roles.sql` | Ajusta RLS de `user_roles` e normaliza `tenant_id` |

> Todos são **idempotentes** — podem ser rodados mais de uma vez sem duplicar.

### Passo 3 — Configurar Auth
Authentication → Providers → Email:
- ❌ **Desativar** "Confirm email" (senão o login trava com *Email not confirmed*).
- ✅ Ativar "Leaked password protection" (recomendado).
- URL Configuration → adicionar o **Site URL** e as **Redirect URLs** do seu domínio.

### Passo 4 — Criar o usuário master
Cadastre-se pelo site e depois rode:

```sql
-- Garante tenant default
insert into public.tenants (id, slug, name, is_active, plan)
values ('1dcddd4d-e3ad-4bbb-b758-d1e94ebe0e73', 'default', 'Default', true, 'free')
on conflict (slug) do update set is_active = true;

-- Concede master + admin
with target_user as (
  select id from auth.users where lower(email) = lower('SEU@EMAIL.COM') limit 1
), tenant as (
  select public.current_tenant_id() as tenant_id
)
insert into public.user_roles (user_id, role, tenant_id)
select target_user.id, r.role, tenant.tenant_id
from target_user, tenant,
     (values ('master'::public.app_role), ('admin'::public.app_role)) as r(role)
on conflict (user_id, role) do update set tenant_id = excluded.tenant_id;

-- Confere
select u.email, public.is_admin(u.id) as is_admin
from auth.users u where lower(u.email) = lower('SEU@EMAIL.COM');
```

Deve retornar `is_admin = true`. **Saia e entre novamente** no site.

### Passo 5 — Campanha especial de depósito
Necessária para o depósito em carteira funcionar (evita erro de foreign key em `orders`):

```sql
insert into public.campaigns (id, title, slug, ticket_price, total_tickets, sold_tickets, status, tenant_id)
values ('00000000-0000-0000-0000-000000000001', 'Depósito em Carteira', 'deposito-carteira',
        1, 1, 0, 'draft', public.current_tenant_id())
on conflict (id) do nothing;
```

### Passo 6 — Apontar o frontend
Edite `src/integrations/supabase/external-client.ts` com a URL e a publishable key do novo projeto.

### Passo 7 — Secrets + Publicar
1. Cadastre todos os secrets da seção 2.2.
2. Publique o app.
3. Conecte o domínio custom em Project Settings → Domains.

---

## 4. Passo a passo (reutilizando o banco externo ATUAL)

Só precisa de:
1. Remixar o projeto.
2. Conferir se `src/integrations/supabase/external-client.ts` já tem a URL/key corretas.
3. Recadastrar os secrets da seção 2.2 (secrets **não** são copiados no remix).
4. Adicionar a URL do novo domínio em Supabase → Authentication → URL Configuration → Redirect URLs.
5. Publicar.

O banco já tem schema, dados, usuários e roles — nada de SQL é necessário.

---

## 5. Multi-tenant (várias plataformas no mesmo banco)

O schema é multi-tenant. Para adicionar um novo domínio/marca no **mesmo banco**:

```sql
-- 1) Novo tenant
insert into public.tenants (slug, name, is_active, plan)
values ('minha-marca', 'Minha Marca', true, 'pro')
returning id;

-- 2) Vincular o domínio
insert into public.tenant_domains (tenant_id, domain, is_primary)
values ('<ID_DO_TENANT>', 'www.meudominio.com.br', true);
```

O `TenantContext` resolve o tenant pelo `hostname` automaticamente
(`src/contexts/TenantContext.tsx`). Se não achar, usa o tenant default.

Cada tabela tem `tenant_id` e as policies RLS isolam os dados por tenant.

---

## 6. Edge Functions incluídas

| Função | Uso |
|---|---|
| `pix-payment` | Gera PIX (provedor configurável) |
| `mercadopago-payment` | Checkout + webhook Mercado Pago |
| `stripe-payment` | Checkout Stripe |
| `process-webhook-queue` | Reprocessa webhooks falhos — protegido por `QUEUE_SECRET` |
| `federal-lottery` | Sincroniza resultados da Loteria Federal |
| `generate-campaign` | Geração assistida de campanha |
| `admin-delete-user` | Exclusão de usuário (admin) |
| `sitemap` | Sitemap dinâmico |
| `version-status`, `hello`, `mcp` | Utilitários |

As funções resolvem o banco em `supabase/functions/_shared/db.ts`:
usam `EXTERNAL_SUPABASE_*` quando definidos, senão o banco do próprio projeto.

---

## 7. Checklist final de verificação

- [ ] Site abre sem tela branca (tenant resolvido)
- [ ] Login e cadastro funcionando (email confirmation desativado)
- [ ] Botão **Administrador** aparece no header (`is_admin = true`)
- [ ] Painel admin → Configurações abre todas as seções
- [ ] Upload de imagem funciona (buckets criados)
- [ ] Campanha abre e permite selecionar cotas
- [ ] Depósito gera PIX (secrets de pagamento configurados)
- [ ] Webhook de pagamento confirma o pedido
- [ ] Domínio custom conectado e com SSL ativo

---

## 8. Segurança — leia antes de publicar

1. 🔴 **Nunca** exponha a `service_role` / `sb_secret_` key no frontend, em SQL de seed ou em chat.
   Se vazar, rotacione imediatamente em Project Settings → API Keys.
2. 🔴 Não guarde tokens privados (Mercado Pago access token, Stripe secret) em `site_settings`.
   Eles pertencem aos **secrets das Edge Functions**.
3. ✅ Valide sempre o valor do depósito **no servidor** (nunca confie no valor enviado pelo cliente).
4. ✅ Valide a assinatura do webhook do Mercado Pago antes de creditar saldo.
5. ✅ Mantenha RLS habilitado em todas as tabelas do schema `public`. Nunca use `USING (true)` em tabelas com dados sensíveis.
6. ✅ Use `public.is_admin(auth.uid())` / `public.has_role()` para checar permissão — nunca leia `user_roles` direto no cliente para decidir acesso.

---

## 9. Arquivos-chave do projeto

```
schema-completo.sql                          # schema + storage completo
setup-storage.sql                            # buckets e policies
seed-site-settings.sql                       # configurações padrão do site
seed-campanhas.sql                           # campanhas demo
fix-user-roles.sql                           # correção de RLS/tenant em user_roles
vite.config.ts                               # alias que redireciona o cliente Supabase
src/integrations/supabase/external-client.ts # 👈 URL + key do banco externo
src/contexts/TenantContext.tsx               # resolução de tenant por domínio
src/lib/tenant.ts                            # acesso síncrono ao tenant atual
supabase/functions/_shared/db.ts             # resolução de credenciais nas functions
```
