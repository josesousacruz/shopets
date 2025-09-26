# Erro: Column not found - 'valor_final' in 'SELECT'

## Problema Identificado
Erro SQL: `SQLSTATE[42S22]: Column not found: 1054 Unknown column 'valor_final' in 'SELECT'`

O erro ocorreu porque havia inconsistência entre a estrutura da tabela `vendas` no banco de dados e as referências nos modelos Eloquent.

## Causa do Erro
1. **Migration da tabela vendas**: A coluna se chama `valor_total`
2. **Modelo Cliente.php**: O accessor `getTotalSpentAttribute()` estava tentando acessar `valor_final`
3. **Modelo Venda.php**: Estava configurado com `valor_final` no fillable, casts e activity log

## Estrutura Correta da Tabela Vendas
Conforme a migration `2025_09_22_154320_create_vendas_table.php`:

```php
$table->decimal('valor_subtotal', 10, 2);
$table->decimal('valor_desconto', 10, 2)->default(0.00);
$table->decimal('valor_acrescimo', 10, 2)->default(0.00);
$table->decimal('valor_total', 10, 2);
$table->decimal('pontos_fidelidade_utilizados', 10, 2)->default(0.00);
$table->decimal('pontos_fidelidade_gerados', 10, 2)->default(0.00);
```

## Correções Aplicadas

### 1. Modelo Cliente.php
**Antes:**
```php
public function getTotalSpentAttribute()
{
    return $this->vendas()->sum('valor_final') ?? 0;
}
```

**Depois:**
```php
public function getTotalSpentAttribute()
{
    return $this->vendas()->sum('valor_total') ?? 0;
}
```

### 2. Modelo Venda.php
**Antes:**
```php
protected $fillable = [
    'numero_venda',
    'data_venda',
    'valor_total',
    'desconto',
    'valor_final',
    // ...
];

protected $casts = [
    'valor_total' => 'decimal:2',
    'desconto' => 'decimal:2',
    'valor_final' => 'decimal:2',
];
```

**Depois:**
```php
protected $fillable = [
    'numero_venda',
    'data_venda',
    'valor_subtotal',
    'valor_desconto',
    'valor_acrescimo',
    'valor_total',
    'pontos_fidelidade_utilizados',
    'pontos_fidelidade_gerados',
    // ...
];

protected $casts = [
    'valor_subtotal' => 'decimal:2',
    'valor_desconto' => 'decimal:2',
    'valor_acrescimo' => 'decimal:2',
    'valor_total' => 'decimal:2',
    'pontos_fidelidade_utilizados' => 'decimal:2',
    'pontos_fidelidade_gerados' => 'decimal:2',
];
```

### 3. Relacionamentos Corrigidos
**Modelo Venda.php:**
```php
public function user()
{
    return $this->belongsTo(User::class, 'id_usuario');
}

public function cliente()
{
    return $this->belongsTo(Cliente::class, 'id_cliente', 'id_cliente');
}

public function pontoVenda()
{
    return $this->belongsTo(PontoVenda::class, 'id_pdv', 'id_pdv');
}
```

**Modelo Cliente.php:**
```php
public function vendas()
{
    return $this->hasMany(Venda::class, 'id_cliente', 'id_cliente');
}
```

## Lições Aprendidas

### 1. Consistência entre Migration e Modelo
- Sempre verificar se os nomes das colunas no modelo correspondem à estrutura real da tabela
- Usar as migrations como fonte da verdade para a estrutura do banco

### 2. Chaves Estrangeiras
- Especificar explicitamente as chaves estrangeiras nos relacionamentos
- Verificar se os nomes das colunas FK correspondem à migration

### 3. Debugging de Erros SQL
- Ler atentamente a mensagem de erro SQL para identificar a coluna problemática
- Verificar o stack trace para localizar onde o erro está sendo gerado

## Checklist de Prevenção
- [ ] Verificar se todos os campos do fillable existem na tabela
- [ ] Confirmar se os casts correspondem às colunas reais
- [ ] Validar se os relacionamentos usam as chaves corretas
- [ ] Testar accessors e mutators após mudanças na estrutura
- [ ] Manter documentação atualizada da estrutura das tabelas

## Resultado
✅ Erro resolvido - os modelos agora estão consistentes com a estrutura da tabela vendas
✅ Relacionamentos corrigidos com as chaves estrangeiras apropriadas
✅ Sistema de vendas e clientes funcionando corretamente