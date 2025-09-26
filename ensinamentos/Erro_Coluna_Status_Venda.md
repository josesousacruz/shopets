# Correção do Erro: Column not found 'status_venda'

## Problema Identificado
**Erro:** `SQLSTATE[42S22]: Column not found: 1054 Unknown column 'status_venda' in 'WHERE'`

**Local:** `FinanceiroController.php` linha 91

**Query problemática:**
```sql
select * from `vendas` where `status_venda` = finalizada order by `data_venda` desc limit 30
```

## Análise do Problema

### 1. Estrutura Real da Tabela
Verificando a migration `2025_09_22_154320_create_vendas_table.php`, a coluna de status é definida como:
```php
$table->enum('status', ['aberta', 'finalizada', 'cancelada', 'devolvida'])->default('aberta');
```

### 2. Código Problemático
No `FinanceiroController.php`, linha 91:
```php
$sales = Venda::with('cliente')
    ->where('status_venda', 'finalizada')  // ❌ ERRO: coluna não existe
    ->orderBy('data_venda', 'desc')
```

## Correção Implementada

### Antes:
```php
->where('status_venda', 'finalizada')
```

### Depois:
```php
->where('status', 'finalizada')
```

## Código Corrigido Completo
```php
// Buscar vendas do banco (últimas 30 vendas)
$sales = Venda::with('cliente')
    ->where('status', 'finalizada')        // ✅ CORRETO: usando nome real da coluna
    ->orderBy('data_venda', 'desc')
    ->limit(30)
    ->get()
    ->map(function ($venda) {
        return [
            'id' => $venda->id_venda,
            'customerId' => $venda->id_cliente,
            'total' => $venda->valor_total,
            'created_at' => $venda->data_venda->format('Y-m-d'),
            'payment_method' => $venda->tipo_venda
        ];
    });
```

## Lições Aprendidas

### 1. Sempre Verificar a Migration
- Antes de usar uma coluna em queries, sempre verificar a migration correspondente
- O nome da coluna na migration é o nome real no banco de dados

### 2. Convenções de Nomenclatura
- A tabela `vendas` usa `status` (simples)
- Não usar prefixos desnecessários como `status_venda`

### 3. Debugging de Erros SQL
- Erros `Column not found` sempre indicam discrepância entre código e estrutura do banco
- Verificar migrations é o primeiro passo para resolver esses erros

### 4. Estrutura da Tabela Vendas
```php
// Colunas principais da tabela vendas:
- id_venda (PK)
- numero_venda
- id_cliente (FK)
- id_usuario (FK) 
- id_pdv (FK)
- valor_subtotal
- valor_desconto
- valor_acrescimo
- valor_total
- pontos_fidelidade_utilizados
- pontos_fidelidade_gerados
- status (enum: 'aberta', 'finalizada', 'cancelada', 'devolvida')
- observacoes
- data_venda
- timestamps
```

## Resultado
✅ Erro corrigido com sucesso
✅ Query agora funciona corretamente
✅ Sistema financeiro pode acessar vendas finalizadas

## Próximos Passos
- Verificar se existem outras queries no sistema usando nomes incorretos de colunas
- Implementar testes para validar queries críticas
- Considerar usar constantes para valores de enum (status)