# Plano de Correção: Erro ao Gerar PIX para Depósito

O problema identificado é uma falha de "Chave Estrangeira" (Foreign Key) na tabela de pedidos (`orders`). O sistema tenta criar um pedido de depósito associado a um ID de campanha técnico (`00000000-0000-0000-0000-000000000001`), mas essa campanha não existe no banco de dados do projeto remixado.

## Ações Propostas

### 1. Backend (Banco de Dados)
- Criar a campanha técnica necessária para processar depósitos.
- Esta campanha servirá como âncora para todos os depósitos diretos de saldo que não estão vinculados a uma rifa específica.

### 2. Frontend (Resiliência)
- Garantir que o `DepositModal` utilize o ID correto e que a interface trate falhas de forma amigável.
- Verificar se existem outras referências a IDs estáticos que possam falhar em novos ambientes.

## Detalhes Técnicos
- **Tabela:** `public.campaigns`
- **ID Fixo:** `00000000-0000-0000-0000-000000000001`
- **Motivo:** O banco de dados do Lovable Cloud para este projeto remixado está vazio/novo e não possui a campanha padrão que existia no projeto original.

## Próximos Passos
1. Executar a migração SQL para inserir a campanha técnica.
2. Validar a criação do pedido no checkout.
