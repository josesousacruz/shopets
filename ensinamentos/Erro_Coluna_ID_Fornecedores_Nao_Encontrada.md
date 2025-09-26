# Erro: Column not found - 'id' na tabela fornecedores

## Descrição do Erro
```
SQLSTATE[42S22]: Column not found: 1054 Unknown column 'id' in 'WHERE' 
(Connection: mariadb, SQL: select count(*) as aggregate from `fornecedores` where `id` = not-informed)
```

## Contexto
- **Arquivo afetado**: `app/Http/Controllers/EstoqueController.php` (linha 203)
- **Operação**: Tentativa de adicionar estoque
- **Causa**: Validação `exists:fornecedores,id` usando chave primária incorreta

## Estrutura Correta da Tabela Fornecedores
```sql
CREATE TABLE fornecedores (
    id_fornecedor BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) NULL,
    telefone VARCHAR(20) NULL,
    email VARCHAR(150) NULL,
    endereco TEXT NULL,
    contato_principal VARCHAR(100) NULL,
    observacoes TEXT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

## Problema Identificado
A validação no `EstoqueController.php` estava usando:
```php
'supplierId' => 'nullable|exists:fornecedores,id'
```

Mas a tabela `fornecedores` usa `id_fornecedor` como chave primária, não `id`.

## Solução Aplicada
### 1. Correção da Validação
**Arquivo**: `app/Http/Controllers/EstoqueController.php`
```php
// ANTES (incorreto)
'supplierId' => 'nullable|exists:fornecedores,id'

// DEPOIS (correto)
'supplierId' => 'nullable|exists:fornecedores,id_fornecedor'
```

## Verificações Realizadas
1. ✅ Confirmada estrutura da migration `create_fornecedores_table.php`
2. ✅ Verificado que não há outras validações similares no código
3. ✅ Corrigida a validação no `EstoqueController.php`

## Lições Aprendidas
1. **Consistência de Nomenclatura**: Sempre verificar a estrutura real das tabelas antes de criar validações
2. **Chaves Primárias Personalizadas**: O projeto usa `id_[tabela]` como padrão para chaves primárias
3. **Validação de Existência**: Sempre usar a coluna correta nas validações `exists:`
4. **Debugging**: Stack trace aponta diretamente para a linha problemática na validação

## Prevenção
- [ ] Verificar todas as validações `exists:` no projeto
- [ ] Documentar padrão de nomenclatura de chaves primárias
- [ ] Criar helper para validações comuns
- [ ] Implementar testes para validações de formulários

## Padrão de Chaves Primárias no Projeto
- `clientes`: `id_cliente`
- `produtos`: `id_produto`
- `fornecedores`: `id_fornecedor`
- `vendas`: `id_venda`
- `usuarios`: `id_usuario`

**Data**: 2025-01-27
**Status**: ✅ Resolvido