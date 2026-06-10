# Sprint 0 — Follow-ups para a Sprint 1

Itens não-bloqueantes levantados no review final da Sprint 0 que devem entrar no plano da Sprint 1.

## 1. `BelongsToEmpresa`: resolver runtime, não config estático

Hoje (`app/Models/Concerns/BelongsToEmpresa.php:30`):
```php
protected static function resolveCurrentEmpresaId(): int
{
    return (int) config('app.current_empresa_id', 1);
}
```

Sempre retorna 1. Quando a Sprint 1 trouxer a primeira request de cliente real (storefront → API), a empresa precisa vir do contexto da request — tipicamente do subdomínio, do header `X-Empresa-ID`, ou de uma resolução por slug.

**Ação na Sprint 1:** introduzir um `EmpresaContext` (singleton bound no container) que o trait consulta. Default permanece 1 para o PDV.

## 2. Guard de `clientes` em `config/auth.php`

`Cliente` agora estende `Authenticatable` e implementa `getAuthIdentifierName()` → `id_cliente`, mas `config/auth.php` ainda não tem um guard ou provider apontando pra ele.

**Ação na Sprint 1 (Sprint 2 da spec, "Cliente & Conta"):** adicionar provider `clientes` e guard `cliente-web`/`cliente-sanctum` no `config/auth.php`.

## 3. SanctumSpaTest: cobrir CSRF round-trip real

`tests/Feature/Sprint0/SanctumSpaTest.php` usa `actingAs($user, 'sanctum')` — atalha o fluxo de cookie/CSRF. Quando o Remix entrar (Sprint 1), criar teste que:
1. `GET /sanctum/csrf-cookie` (lê XSRF-TOKEN)
2. `POST /login` com `X-XSRF-TOKEN` + `Origin: http://localhost:3000`
3. Verifica que a sessão é aceita e `GET /api/user` responde.

## 4. FULLTEXT requer InnoDB

A migration `2026_06_09_100002_add_ecommerce_columns_to_produtos.php` adiciona `FULLTEXT` no MySQL sem checar engine da tabela. Em produção MariaDB / MySQL 5.6+ com InnoDB default funciona, mas se o cliente herdar uma tabela MyISAM antiga a migration falha silenciosamente.

**Ação:** antes do primeiro deploy de produção, validar engine ou adicionar pre-check no instalador.
