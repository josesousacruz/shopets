# Ecommerce — Sprint 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar a base do Laravel para receber o ecommerce sem alterar o comportamento do PDV: stack Docker para dev, Sanctum SPA + CORS, esqueleto da camada Domain, escopo de empresa (multi-empresa ready), e colunas aditivas em `produtos`, `categorias` e `clientes`.

**Architecture:** Tudo aditivo no Laravel atual; nenhuma rota nova; nenhum endpoint público; nenhum frontend. As migrações são versionadas como novos arquivos (não editar migrações antigas). A camada `app/Domain/*` é criada com diretórios e um `README.md` por bounded context — código real entra nas sprints seguintes.

**Tech Stack:** Laravel 12, PHP 8.2+, MySQL 8 (prod) + SQLite in-memory (testes), Redis 7, Docker Compose, Sanctum 4, PHPUnit 11.

**Spec de referência:** [docs/superpowers/specs/2026-06-09-ecommerce-design.md](../specs/2026-06-09-ecommerce-design.md) — seções 3 (Arquitetura), 4 (Schema), 8 (Sprint 0).

**Ajuste de escopo vs spec:** o job `LimparReservasExpiradas` foi movido pra Sprint 3 (onde a tabela `reservas_estoque` é criada). Sprint 0 fica focada em fundação.

**Convenções:**
- Commands abaixo assumem PowerShell (Windows). Para Git Bash, substituir `;` por `&&` quando aplicável. `php artisan ...` funciona idêntico em ambos.
- Path raiz do projeto: `C:\Projetos\PDV-Ecomerce\shopets`. Todos os paths de arquivo são relativos a esse diretório.
- Testes: PHPUnit, SQLite em memória (já configurado em `phpunit.xml`). Cada Feature test usa `RefreshDatabase`.
- Antes de qualquer Task, garantir que o working tree está limpo e o PDV atual sobe (`php artisan serve` em :8000 abre a tela de login). Se não estiver, parar e investigar antes.

---

## File Structure

Diretórios e arquivos criados/modificados nesta sprint:

```
shopets/
├── docker-compose.yml                                       (criar)
├── docker/
│   ├── php/Dockerfile                                       (criar)
│   ├── nginx/default.conf                                   (criar)
│   └── README.md                                            (criar)
├── app/
│   ├── Domain/
│   │   ├── Catalog/README.md                                (criar)
│   │   ├── Cart/README.md                                   (criar)
│   │   ├── Checkout/README.md                               (criar)
│   │   ├── Order/README.md                                  (criar)
│   │   ├── Shipping/README.md                               (criar)
│   │   ├── Payment/README.md                                (criar)
│   │   └── Fiscal/README.md                                 (criar)
│   ├── Models/
│   │   ├── Concerns/BelongsToEmpresa.php                    (criar)
│   │   ├── Produto.php                                      (modificar)
│   │   ├── Categoria.php                                    (modificar)
│   │   └── Cliente.php                                      (modificar)
│   └── Http/Middleware/                                     (Sanctum publicado)
├── config/
│   ├── sanctum.php                                          (publicado)
│   └── cors.php                                             (modificar)
├── bootstrap/app.php                                        (modificar — middleware Sanctum)
├── database/
│   ├── migrations/
│   │   ├── 2026_06_09_100001_add_id_empresa_to_core_tables.php       (criar)
│   │   ├── 2026_06_09_100002_add_ecommerce_columns_to_produtos.php   (criar)
│   │   ├── 2026_06_09_100003_add_ecommerce_columns_to_categorias.php (criar)
│   │   ├── 2026_06_09_100004_add_auth_columns_to_clientes.php        (criar)
│   │   └── 2026_06_09_100005_create_personal_access_tokens_table.php (vendor publish)
│   └── seeders/
│       ├── BackfillSlugsSeeder.php                          (criar)
│       └── EcommercePermissionSeeder.php                    (criar)
├── tests/
│   ├── Feature/
│   │   ├── Sprint0/
│   │   │   ├── EmpresaScopeTest.php                         (criar)
│   │   │   ├── ProdutoEcommerceColumnsTest.php              (criar)
│   │   │   ├── CategoriaEcommerceColumnsTest.php            (criar)
│   │   │   ├── ClienteAuthTest.php                          (criar)
│   │   │   ├── SanctumSpaTest.php                           (criar)
│   │   │   └── EcommercePermissionsTest.php                 (criar)
│   └── Unit/Sprint0/                                        (vazio por enquanto)
└── docs/superpowers/plans/
    └── 2026-06-09-ecommerce-sprint-0-foundation.md          (este arquivo)
```

---

## Task 1: Docker Compose para dev (MySQL + Redis + PHP-FPM + Nginx)

**Files:**
- Create: `docker-compose.yml`
- Create: `docker/php/Dockerfile`
- Create: `docker/nginx/default.conf`
- Create: `docker/README.md`
- Modify: `.env` (acrescentar entradas para Redis)

- [ ] **Step 1: Criar `docker/php/Dockerfile`**

```dockerfile
FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev \
    libzip-dev oniguruma-dev icu-dev \
    mysql-client git unzip \
 && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
 && docker-php-ext-install -j$(nproc) gd pdo_mysql mbstring zip exif pcntl bcmath intl \
 && pecl install redis && docker-php-ext-enable redis

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
EXPOSE 9000
CMD ["php-fpm"]
```

- [ ] **Step 2: Criar `docker/nginx/default.conf`**

```nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/html/public;
    index index.php;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    client_max_body_size 32M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass php:9000;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* { deny all; }
}
```

- [ ] **Step 3: Criar `docker-compose.yml` na raiz do projeto**

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: shopets-mysql
    environment:
      MYSQL_DATABASE: shopets
      MYSQL_ROOT_PASSWORD: root
      MYSQL_USER: shopets
      MYSQL_PASSWORD: shopets
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    container_name: shopets-redis
    ports:
      - "6379:6379"

  php:
    build:
      context: .
      dockerfile: docker/php/Dockerfile
    container_name: shopets-php
    volumes:
      - .:/var/www/html
    depends_on:
      - mysql
      - redis

  nginx:
    image: nginx:1.27-alpine
    container_name: shopets-nginx
    ports:
      - "8000:80"
    volumes:
      - .:/var/www/html:ro
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - php

volumes:
  mysql-data:
```

- [ ] **Step 4: Criar `docker/README.md`**

```markdown
# Docker dev stack

Sobe MySQL 8, Redis 7, PHP-FPM 8.3 e Nginx para rodar o Laravel localmente.

## Subir
```
docker compose up -d
```

## Primeira vez
```
docker compose exec php composer install
docker compose exec php php artisan key:generate
docker compose exec php php artisan migrate --seed
```

## Acessar
- App: http://localhost:8000
- MySQL: localhost:3306 (user: shopets / pass: shopets / db: shopets)
- Redis: localhost:6379

## Logs
```
docker compose logs -f php nginx
```
```

- [ ] **Step 5: Ajustar `.env` (acrescentar Redis e mudar host do DB para o serviço)**

Adicionar/atualizar estas linhas no `.env` (só local — `.env.example` não precisa mudar agora):

```
DB_HOST=mysql
REDIS_HOST=redis
REDIS_PORT=6379
QUEUE_CONNECTION=redis
CACHE_STORE=redis
SESSION_DRIVER=database
```

- [ ] **Step 6: Verificar stack sobe e Laravel responde**

```powershell
docker compose build php
docker compose up -d
docker compose exec php composer install
docker compose exec php php artisan migrate
```

Abrir `http://localhost:8000` — deve mostrar a tela de login do PDV. Se aparecer erro de conexão MySQL, esperar 10s e tentar de novo (MySQL leva alguns segundos pra ficar healthy).

- [ ] **Step 7: Commit**

```powershell
git add docker-compose.yml docker/ .env
git commit -m "chore(docker): adiciona stack dev (mysql, redis, php-fpm, nginx)"
```

---

## Task 2: Sanctum (SPA mode + CORS para localhost:3000)

**Files:**
- Modify: `composer.json` (via composer require — Sanctum normalmente já vem com starter kit; verificar)
- Modify: `config/cors.php`
- Create/modify: `config/sanctum.php` (publicar config)
- Create: migration `create_personal_access_tokens_table` (via `php artisan sanctum:install`)
- Modify: `bootstrap/app.php` (registrar middleware EnsureFrontendRequestsAreStateful no grupo `api`)
- Modify: `.env` (SESSION_DOMAIN e SANCTUM_STATEFUL_DOMAINS)
- Create: `tests/Feature/Sprint0/SanctumSpaTest.php`

- [ ] **Step 1: Verificar se Sanctum já está instalado**

```powershell
docker compose exec php php artisan about | Select-String -Pattern "sanctum" -SimpleMatch
```

Se não aparecer nada, instalar:

```powershell
docker compose exec php composer require laravel/sanctum
docker compose exec php php artisan install:api
```

`install:api` publica config, registra `api.php` em routes (se não existir) e cria a migração `personal_access_tokens`.

- [ ] **Step 2: Rodar migrations**

```powershell
docker compose exec php php artisan migrate
```

Esperado: `personal_access_tokens` criada.

- [ ] **Step 3: Configurar `config/cors.php`**

Substituir o array `paths` e `allowed_origins`:

```php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:3000',
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
```

- [ ] **Step 4: Acrescentar variáveis ao `.env`**

```
APP_URL=http://localhost:8000
SANCTUM_STATEFUL_DOMAINS=localhost:3000
SESSION_DOMAIN=localhost
```

- [ ] **Step 5: Registrar middleware Sanctum em `bootstrap/app.php`**

Abrir `bootstrap/app.php` e dentro de `->withMiddleware(function (Middleware $middleware) { ... })` adicionar:

```php
$middleware->statefulApi();
```

(em Laravel 12 esse helper substitui o registro manual de `EnsureFrontendRequestsAreStateful`.)

- [ ] **Step 6: Escrever teste de Sanctum SPA — primeiro a falhar**

Criar `tests/Feature/Sprint0/SanctumSpaTest.php`:

```php
<?php

namespace Tests\Feature\Sprint0;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SanctumSpaTest extends TestCase
{
    use RefreshDatabase;

    public function test_csrf_cookie_endpoint_responds(): void
    {
        $this->getJson('/sanctum/csrf-cookie')->assertNoContent();
    }

    public function test_authenticated_user_can_access_api_user_endpoint(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user');

        $response->assertOk()->assertJsonPath('id', $user->id);
    }
}
```

- [ ] **Step 7: Confirmar que `/api/user` existe (ou criar)**

Verificar `routes/api.php`:

```powershell
docker compose exec php cat routes/api.php
```

Se não houver `Route::get('/user', ...)`, adicionar ao final do arquivo:

```php
Route::middleware('auth:sanctum')->get('/user', function (\Illuminate\Http\Request $request) {
    return $request->user();
});
```

- [ ] **Step 8: Rodar os testes e ver verde**

```powershell
docker compose exec php php artisan test --filter=SanctumSpaTest
```

Esperado: 2 passed.

- [ ] **Step 9: Commit**

```powershell
git add composer.json composer.lock config/cors.php config/sanctum.php bootstrap/app.php routes/api.php database/migrations/ tests/Feature/Sprint0/SanctumSpaTest.php .env
git commit -m "feat(auth): configura Sanctum SPA + CORS para storefront em localhost:3000"
```

---

## Task 3: Esqueleto da camada Domain (Catalog, Cart, Checkout, Order, Shipping, Payment, Fiscal)

**Files:**
- Create: `app/Domain/Catalog/README.md`
- Create: `app/Domain/Cart/README.md`
- Create: `app/Domain/Checkout/README.md`
- Create: `app/Domain/Order/README.md`
- Create: `app/Domain/Shipping/README.md`
- Create: `app/Domain/Payment/README.md`
- Create: `app/Domain/Fiscal/README.md`

**Por que só README:** Sprint 0 não migra código existente para os bounded contexts — fazer isso sem testes prévios é arriscado. Cada sprint subsequente migra a parte do PDV que ela toca. Aqui só estabelecemos o **namespace e a convenção**.

- [ ] **Step 1: Criar `app/Domain/Catalog/README.md`**

```markdown
# Domain: Catalog

Bounded context de catálogo (produtos, categorias, variações, imagens, SEO).

## Responsabilidades
- Listar e buscar produtos visíveis no ecommerce
- Cadastro/edição de produto (PDV + ecommerce)
- Categorias e hierarquia
- Variações (SKU por modelo/cor)

## Não é responsabilidade
- Estoque disponível para venda → Domain/Order
- Preço com cupom → Domain/Checkout

## Namespace
`App\Domain\Catalog`

## Como popular
Migrar `EstoqueController` e partes do `ProdutoController` para Services/Actions deste namespace nas sprints 1 e 5.
```

- [ ] **Step 2: Criar `app/Domain/Cart/README.md`**

```markdown
# Domain: Cart

Carrinho persistido server-side identificado por cookie `cart_token` (guest) ou `id_cliente` (logado).

## Responsabilidades
- Adicionar/remover/atualizar itens
- Mesclar carrinho guest com cliente ao logar
- Calcular subtotal sem desconto

## Namespace
`App\Domain\Cart`

## Quando preencher
Sprint 3.
```

- [ ] **Step 3: Criar `app/Domain/Checkout/README.md`**

```markdown
# Domain: Checkout

Coordena endereço → frete → reserva de estoque → criação de pedido.

## Responsabilidades
- `IniciarCheckoutAction` (cria reserva + pedido `aguardando_pagamento`)
- Aplicar cupom
- Validar disponibilidade no momento da reserva

## Namespace
`App\Domain\Checkout`

## Quando preencher
Sprint 3 e Sprint 4.
```

- [ ] **Step 4: Criar `app/Domain/Order/README.md`**

```markdown
# Domain: Order

Ciclo de vida do pedido após criação: pago → em separação → enviado → entregue → devolvido/cancelado.

## Responsabilidades
- Transições de status
- Eventos do pedido (timeline)
- Ponte Pedido → Venda fiscal (`PromoverPedidoEmVendaAction`)
- Devoluções

## Namespace
`App\Domain\Order`

## Quando preencher
Sprint 4 (criação + pago); Sprint 5 (logística); Sprint 6 (devoluções).
```

- [ ] **Step 5: Criar `app/Domain/Shipping/README.md`**

```markdown
# Domain: Shipping

Cotação e contratação de frete via Melhor Envio.

## Responsabilidades
- `CotarFreteAction` (POST Melhor Envio)
- `GerarEtiquetaAction`
- Cache de cotação por CEP+peso

## Namespace
`App\Domain\Shipping`

## Quando preencher
Sprint 3 (cotação); Sprint 5 (etiqueta).
```

- [ ] **Step 6: Criar `app/Domain/Payment/README.md`**

```markdown
# Domain: Payment

Abstração de gateway de pagamento. MVP: Mercado Pago.

## Responsabilidades
- `PaymentGatewayInterface` (charge, refund, status)
- `MercadoPagoGateway`
- Processar webhook (idempotente por `gateway_id_externo`)

## Namespace
`App\Domain\Payment`

## Quando preencher
Sprint 4.
```

- [ ] **Step 7: Criar `app/Domain/Fiscal/README.md`**

```markdown
# Domain: Fiscal

Emissão de documento fiscal a partir de um pedido pago.

## Responsabilidades
- `EmitirNotaFiscalJob` decide NFe (entrega) ou NFCe (retirada)
- Reusa `App\Services\NfceService` existente
- Cria `NfeService` análogo

## Namespace
`App\Domain\Fiscal`

## Quando preencher
Sprint 4.
```

- [ ] **Step 8: Confirmar que autoload funciona (PSR-4 já cobre `App\\` → `app/`)**

```powershell
docker compose exec php composer dump-autoload
docker compose exec php php artisan about | Select-String -Pattern "Laravel"
```

Esperado: nenhum erro.

- [ ] **Step 9: Commit**

```powershell
git add app/Domain/
git commit -m "chore(domain): esqueleto dos bounded contexts (catalog, cart, checkout, order, shipping, payment, fiscal)"
```

---

## Task 4: Multi-empresa ready (`id_empresa` + global scope)

**Files:**
- Create: `app/Models/Concerns/BelongsToEmpresa.php`
- Create: `database/migrations/2026_06_09_100001_add_id_empresa_to_core_tables.php`
- Modify: `app/Models/Produto.php`
- Modify: `app/Models/Categoria.php`
- Modify: `app/Models/Cliente.php`
- Create: `tests/Feature/Sprint0/EmpresaScopeTest.php`

- [ ] **Step 1: Criar trait `app/Models/Concerns/BelongsToEmpresa.php`**

```php
<?php

namespace App\Models\Concerns;

use App\Models\ConfiguracaoEmpresa;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToEmpresa
{
    public static function bootBelongsToEmpresa(): void
    {
        static::creating(function ($model) {
            if (empty($model->id_empresa)) {
                $model->id_empresa = static::resolveCurrentEmpresaId();
            }
        });

        static::addGlobalScope('empresa', function (Builder $builder) {
            $builder->where($builder->getModel()->getTable().'.id_empresa', static::resolveCurrentEmpresaId());
        });
    }

    public function empresa()
    {
        return $this->belongsTo(ConfiguracaoEmpresa::class, 'id_empresa');
    }

    protected static function resolveCurrentEmpresaId(): int
    {
        return (int) config('app.current_empresa_id', 1);
    }
}
```

- [ ] **Step 2: Acrescentar default ao `config/app.php`**

Adicionar antes do fechamento do array `return`:

```php
    'current_empresa_id' => env('APP_CURRENT_EMPRESA_ID', 1),
```

- [ ] **Step 3: Criar migration `add_id_empresa_to_core_tables`**

```powershell
docker compose exec php php artisan make:migration add_id_empresa_to_core_tables
```

Renomear o arquivo gerado para começar com timestamp `2026_06_09_100001_` (se já não estiver). Conteúdo:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        foreach (['produtos', 'categorias', 'clientes'] as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->unsignedBigInteger('id_empresa')->default(1)->after('id_'.str_replace('s', '', $table->getTable()) === 'id_clientes' ? 'cliente' : 'categoria');
            });
        }

        DB::statement('UPDATE produtos SET id_empresa = 1');
        DB::statement('UPDATE categorias SET id_empresa = 1');
        DB::statement('UPDATE clientes SET id_empresa = 1');

        foreach (['produtos', 'categorias', 'clientes'] as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->index('id_empresa');
            });
        }
    }

    public function down(): void
    {
        foreach (['produtos', 'categorias', 'clientes'] as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->dropIndex([$tabela.'_id_empresa_index']);
                $table->dropColumn('id_empresa');
            });
        }
    }
};
```

Nota: o `after()` acima é frágil. Simplificar para sempre colocar no final da tabela — Laravel/MySQL aceitam:

```php
$table->unsignedBigInteger('id_empresa')->default(1);
```

(removendo o `->after(...)`). Use essa versão simplificada.

- [ ] **Step 4: Rodar migration**

```powershell
docker compose exec php php artisan migrate
```

Esperado: `add_id_empresa_to_core_tables` aplicada.

- [ ] **Step 5: Aplicar trait em `app/Models/Produto.php`**

No topo do arquivo, junto dos outros `use`:

```php
use App\Models\Concerns\BelongsToEmpresa;
```

No corpo da classe, após `use HasFactory, LogsActivity, InteractsWithMedia;`:

```php
    use BelongsToEmpresa;
```

E acrescentar `'id_empresa'` ao array `$fillable`.

- [ ] **Step 6: Aplicar trait em `app/Models/Categoria.php`**

Mesma coisa: `use App\Models\Concerns\BelongsToEmpresa;` no topo, `use BelongsToEmpresa;` no corpo, `'id_empresa'` no `$fillable`.

- [ ] **Step 7: Aplicar trait em `app/Models/Cliente.php`**

Idem.

- [ ] **Step 8: Escrever teste de escopo — primeiro a falhar**

Criar `tests/Feature/Sprint0/EmpresaScopeTest.php`:

```php
<?php

namespace Tests\Feature\Sprint0;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EmpresaScopeTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_produto_assigns_current_empresa_id(): void
    {
        $cat = Categoria::create(['nome' => 'X', 'ativo' => true]);

        $produto = Produto::create([
            'nome'          => 'Teste',
            'preco_custo'   => 10,
            'preco_venda'   => 20,
            'unidade'       => 'un',
            'id_categoria'  => $cat->id_categoria,
        ]);

        $this->assertSame(1, (int) $produto->id_empresa);
    }

    public function test_global_scope_filters_by_current_empresa(): void
    {
        $cat = Categoria::create(['nome' => 'Y', 'ativo' => true]);
        Produto::create([
            'nome' => 'A', 'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);

        DB::table('produtos')->insert([
            'nome' => 'B', 'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
            'id_empresa' => 999,
            'estoque_atual' => 0, 'estoque_minimo' => 0,
            'permite_fracao' => 0, 'ativo' => 1,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->assertSame(1, Produto::count());
        $this->assertSame(2, DB::table('produtos')->count());
    }
}
```

- [ ] **Step 9: Rodar testes**

```powershell
docker compose exec php php artisan test --filter=EmpresaScopeTest
```

Esperado: 2 passed.

- [ ] **Step 10: Commit**

```powershell
git add app/Models/Concerns/ app/Models/Produto.php app/Models/Categoria.php app/Models/Cliente.php config/app.php database/migrations/2026_06_09_100001_add_id_empresa_to_core_tables.php tests/Feature/Sprint0/EmpresaScopeTest.php
git commit -m "feat(multi-empresa): id_empresa + global scope nas tabelas core"
```

---

## Task 5: Colunas de ecommerce em `produtos`

**Files:**
- Create: `database/migrations/2026_06_09_100002_add_ecommerce_columns_to_produtos.php`
- Modify: `app/Models/Produto.php` (acrescentar campos a `$fillable`)
- Create: `database/seeders/BackfillSlugsSeeder.php`
- Create: `tests/Feature/Sprint0/ProdutoEcommerceColumnsTest.php`

- [ ] **Step 1: Criar migration**

```powershell
docker compose exec php php artisan make:migration add_ecommerce_columns_to_produtos
```

Renomear para timestamp `2026_06_09_100002_`. Conteúdo:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            $table->string('slug', 220)->nullable()->unique();
            $table->string('descricao_curta', 500)->nullable();
            $table->text('descricao_longa')->nullable();
            $table->unsignedInteger('peso_gramas')->nullable();
            $table->decimal('altura_cm', 6, 2)->nullable();
            $table->decimal('largura_cm', 6, 2)->nullable();
            $table->decimal('comprimento_cm', 6, 2)->nullable();
            $table->string('meta_title')->nullable();
            $table->string('meta_description', 320)->nullable();
            $table->string('og_image_path')->nullable();
            $table->boolean('destaque')->default(false);
            $table->boolean('novo')->default(false);
            $table->boolean('em_promocao')->default(false);
            $table->decimal('preco_promocional', 10, 2)->nullable();
            $table->boolean('visivel_ecommerce')->default(false);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE produtos ADD FULLTEXT INDEX produtos_fulltext_idx (nome, descricao_curta, descricao_longa)');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE produtos DROP INDEX produtos_fulltext_idx');
        }

        Schema::table('produtos', function (Blueprint $table) {
            $table->dropColumn([
                'slug', 'descricao_curta', 'descricao_longa',
                'peso_gramas', 'altura_cm', 'largura_cm', 'comprimento_cm',
                'meta_title', 'meta_description', 'og_image_path',
                'destaque', 'novo', 'em_promocao', 'preco_promocional',
                'visivel_ecommerce',
            ]);
        });
    }
};
```

(O FULLTEXT é condicional porque SQLite — usado nos testes — não suporta.)

- [ ] **Step 2: Atualizar `$fillable` em `app/Models/Produto.php`**

Acrescentar ao array `$fillable`:

```php
    'slug', 'descricao_curta', 'descricao_longa',
    'peso_gramas', 'altura_cm', 'largura_cm', 'comprimento_cm',
    'meta_title', 'meta_description', 'og_image_path',
    'destaque', 'novo', 'em_promocao', 'preco_promocional',
    'visivel_ecommerce',
```

E ao `$casts`:

```php
    'destaque' => 'boolean',
    'novo' => 'boolean',
    'em_promocao' => 'boolean',
    'visivel_ecommerce' => 'boolean',
    'preco_promocional' => 'decimal:2',
```

- [ ] **Step 3: Rodar migration**

```powershell
docker compose exec php php artisan migrate
```

- [ ] **Step 4: Criar seeder de backfill de slug**

`database/seeders/BackfillSlugsSeeder.php`:

```php
<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BackfillSlugsSeeder extends Seeder
{
    public function run(): void
    {
        Produto::query()->whereNull('slug')->each(function (Produto $p) {
            $p->slug = $this->uniqueSlug(Produto::class, 'slug', $p->nome, $p->id_produto);
            $p->save();
        });

        Categoria::query()->whereNull('slug')->each(function (Categoria $c) {
            $c->slug = $this->uniqueSlug(Categoria::class, 'slug', $c->nome, $c->id_categoria);
            $c->save();
        });
    }

    private function uniqueSlug(string $modelClass, string $column, string $source, int $ownId): string
    {
        $base = Str::slug($source);
        $slug = $base;
        $i = 2;

        while ($modelClass::query()->where($column, $slug)->where(function ($q) use ($ownId, $modelClass) {
            $key = (new $modelClass)->getKeyName();
            $q->where($key, '!=', $ownId);
        })->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
```

- [ ] **Step 5: Rodar o backfill (no banco com os 50 produtos do seeder anterior)**

```powershell
docker compose exec php php artisan db:seed --class=BackfillSlugsSeeder
```

Verificar:

```powershell
docker compose exec php php artisan tinker --execute="echo App\Models\Produto::whereNull('slug')->count();"
```

Esperado: `0`.

- [ ] **Step 6: Escrever teste de colunas**

Criar `tests/Feature/Sprint0/ProdutoEcommerceColumnsTest.php`:

```php
<?php

namespace Tests\Feature\Sprint0;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProdutoEcommerceColumnsTest extends TestCase
{
    use RefreshDatabase;

    public function test_produto_persists_new_ecommerce_columns(): void
    {
        $cat = Categoria::create(['nome' => 'C', 'ativo' => true]);

        $p = Produto::create([
            'nome'              => 'Capa X',
            'slug'              => 'capa-x',
            'descricao_curta'   => 'curta',
            'descricao_longa'   => 'longa',
            'preco_custo'       => 5,
            'preco_venda'       => 10,
            'preco_promocional' => 7.50,
            'unidade'           => 'un',
            'id_categoria'      => $cat->id_categoria,
            'peso_gramas'       => 80,
            'altura_cm'         => 16.5,
            'largura_cm'        => 8,
            'comprimento_cm'    => 1.2,
            'meta_title'        => 'Capa X SEO',
            'meta_description'  => 'Descrição SEO',
            'destaque'          => true,
            'novo'              => true,
            'em_promocao'       => true,
            'visivel_ecommerce' => true,
        ]);

        $p->refresh();

        $this->assertSame('capa-x', $p->slug);
        $this->assertTrue($p->visivel_ecommerce);
        $this->assertTrue($p->em_promocao);
        $this->assertEquals(7.50, (float) $p->preco_promocional);
        $this->assertSame(80, (int) $p->peso_gramas);
    }

    public function test_slug_is_unique(): void
    {
        $cat = Categoria::create(['nome' => 'C', 'ativo' => true]);

        Produto::create([
            'nome' => 'A', 'slug' => 'dup',
            'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Produto::create([
            'nome' => 'B', 'slug' => 'dup',
            'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);
    }
}
```

- [ ] **Step 7: Rodar testes**

```powershell
docker compose exec php php artisan test --filter=ProdutoEcommerceColumnsTest
```

Esperado: 2 passed.

- [ ] **Step 8: Commit**

```powershell
git add database/migrations/2026_06_09_100002_add_ecommerce_columns_to_produtos.php database/seeders/BackfillSlugsSeeder.php app/Models/Produto.php tests/Feature/Sprint0/ProdutoEcommerceColumnsTest.php
git commit -m "feat(catalog): colunas de ecommerce em produtos (slug, descrição, SEO, peso/dim, badges)"
```

---

## Task 6: Colunas de ecommerce em `categorias`

**Files:**
- Create: `database/migrations/2026_06_09_100003_add_ecommerce_columns_to_categorias.php`
- Modify: `app/Models/Categoria.php`
- Create: `tests/Feature/Sprint0/CategoriaEcommerceColumnsTest.php`

- [ ] **Step 1: Criar migration**

```powershell
docker compose exec php php artisan make:migration add_ecommerce_columns_to_categorias
```

Renomear para `2026_06_09_100003_`. Conteúdo:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->string('slug', 150)->nullable()->unique();
            $table->text('descricao_seo')->nullable();
            $table->string('imagem_path')->nullable();
            $table->unsignedInteger('ordem')->default(0);
            $table->boolean('visivel_ecommerce')->default(true);
            $table->unsignedBigInteger('id_categoria_pai')->nullable();
            $table->foreign('id_categoria_pai')
                  ->references('id_categoria')->on('categorias')
                  ->nullOnDelete();
            $table->index('ordem');
        });
    }

    public function down(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->dropForeign(['id_categoria_pai']);
            $table->dropIndex(['ordem']);
            $table->dropColumn([
                'slug', 'descricao_seo', 'imagem_path',
                'ordem', 'visivel_ecommerce', 'id_categoria_pai',
            ]);
        });
    }
};
```

- [ ] **Step 2: Atualizar `app/Models/Categoria.php`**

Acrescentar ao `$fillable`: `'slug', 'descricao_seo', 'imagem_path', 'ordem', 'visivel_ecommerce', 'id_categoria_pai'`.

Acrescentar relação:

```php
public function pai()
{
    return $this->belongsTo(self::class, 'id_categoria_pai', 'id_categoria');
}

public function filhas()
{
    return $this->hasMany(self::class, 'id_categoria_pai', 'id_categoria');
}
```

- [ ] **Step 3: Rodar migration**

```powershell
docker compose exec php php artisan migrate
```

- [ ] **Step 4: Rodar BackfillSlugsSeeder novamente (agora preenche categorias também)**

```powershell
docker compose exec php php artisan db:seed --class=BackfillSlugsSeeder
```

Verificar:

```powershell
docker compose exec php php artisan tinker --execute="echo App\Models\Categoria::whereNull('slug')->count();"
```

Esperado: `0`.

- [ ] **Step 5: Escrever teste**

Criar `tests/Feature/Sprint0/CategoriaEcommerceColumnsTest.php`:

```php
<?php

namespace Tests\Feature\Sprint0;

use App\Models\Categoria;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoriaEcommerceColumnsTest extends TestCase
{
    use RefreshDatabase;

    public function test_categoria_persists_new_columns(): void
    {
        $cat = Categoria::create([
            'nome' => 'Capas', 'slug' => 'capas',
            'descricao_seo' => 'capas SEO', 'ordem' => 5,
            'visivel_ecommerce' => true, 'ativo' => true,
        ]);
        $cat->refresh();

        $this->assertSame('capas', $cat->slug);
        $this->assertSame(5, (int) $cat->ordem);
        $this->assertTrue($cat->visivel_ecommerce);
    }

    public function test_self_referencing_parent_works(): void
    {
        $pai = Categoria::create(['nome' => 'Acessórios', 'slug' => 'acessorios', 'ativo' => true]);
        $filha = Categoria::create([
            'nome' => 'Carregadores', 'slug' => 'carregadores',
            'ativo' => true, 'id_categoria_pai' => $pai->id_categoria,
        ]);

        $this->assertSame($pai->id_categoria, $filha->pai->id_categoria);
        $this->assertCount(1, $pai->filhas);
    }
}
```

- [ ] **Step 6: Rodar testes**

```powershell
docker compose exec php php artisan test --filter=CategoriaEcommerceColumnsTest
```

Esperado: 2 passed.

- [ ] **Step 7: Commit**

```powershell
git add database/migrations/2026_06_09_100003_add_ecommerce_columns_to_categorias.php app/Models/Categoria.php tests/Feature/Sprint0/CategoriaEcommerceColumnsTest.php
git commit -m "feat(catalog): colunas de ecommerce em categorias (slug, ordem, hierarquia, visibilidade)"
```

---

## Task 7: Colunas de autenticação em `clientes` + Authenticatable

**Files:**
- Create: `database/migrations/2026_06_09_100004_add_auth_columns_to_clientes.php`
- Modify: `app/Models/Cliente.php` (implementar Authenticatable + HasApiTokens)
- Create: `tests/Feature/Sprint0/ClienteAuthTest.php`

- [ ] **Step 1: Criar migration**

```powershell
docker compose exec php php artisan make:migration add_auth_columns_to_clientes
```

Renomear para `2026_06_09_100004_`. Conteúdo:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // A coluna `email` já existe em `clientes` (string(150) com index não-único).
        // Apenas substituímos o índice por um unique e adicionamos as colunas de auth.
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropIndex('clientes_email_index');
        });

        Schema::table('clientes', function (Blueprint $table) {
            $table->unique('email', 'clientes_email_unique');

            $table->timestamp('email_verified_at')->nullable()->after('email');
            $table->string('password')->nullable()->after('email_verified_at');
            $table->enum('origem', ['pdv', 'ecommerce', 'ambos'])->default('pdv')->after('password');
            $table->boolean('aceita_marketing')->default(false)->after('origem');
            $table->rememberToken();
        });
    }

    public function down(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->dropUnique('clientes_email_unique');
            $table->dropColumn([
                'email_verified_at', 'password',
                'origem', 'aceita_marketing', 'remember_token',
            ]);
            $table->index('email', 'clientes_email_index');
        });
    }
};
```

- [ ] **Step 2: Atualizar `app/Models/Cliente.php`**

Imports no topo (acrescentar):

```php
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
```

Mudar a declaração da classe para herdar de `Authenticatable`:

```php
class Cliente extends Authenticatable
{
    use HasApiTokens, Notifiable;
    // ... traits existentes
}
```

(Se hoje a classe herda de `Model`, a troca é segura — `Authenticatable` é só um `Model` com helpers de auth. Verificar se já há `extends Model`.)

Acrescentar ao `$fillable` (note que `'email'` já está lá): `'password', 'origem', 'aceita_marketing'`.

Acrescentar a `$hidden`:

```php
protected $hidden = ['password', 'remember_token'];
```

Acrescentar a `$casts`:

```php
'password' => 'hashed',
'email_verified_at' => 'datetime',
'aceita_marketing' => 'boolean',
```

Override do campo primário (Sanctum espera `id` ou que o model defina `getAuthIdentifierName`):

```php
public function getAuthIdentifierName()
{
    return 'id_cliente';
}
```

- [ ] **Step 3: Rodar migration**

```powershell
docker compose exec php php artisan migrate
```

- [ ] **Step 4: Escrever teste**

Criar `tests/Feature/Sprint0/ClienteAuthTest.php`:

```php
<?php

namespace Tests\Feature\Sprint0;

use App\Models\Cliente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ClienteAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_cliente_can_be_created_with_credentials(): void
    {
        $cliente = Cliente::create([
            'nome'             => 'Almir',
            'email'            => 'almir@example.com',
            'password'         => 'segredo123',
            'origem'           => 'ecommerce',
            'aceita_marketing' => true,
        ]);

        $this->assertNotEmpty($cliente->password);
        $this->assertTrue(Hash::check('segredo123', $cliente->password));
        $this->assertSame('almir@example.com', $cliente->email);
    }

    public function test_email_is_unique(): void
    {
        Cliente::create(['nome' => 'A', 'email' => 'x@example.com', 'password' => 'a']);

        $this->expectException(\Illuminate\Database\QueryException::class);
        Cliente::create(['nome' => 'B', 'email' => 'x@example.com', 'password' => 'b']);
    }

    public function test_password_is_hidden_in_json(): void
    {
        $cliente = Cliente::create(['nome' => 'A', 'email' => 'y@example.com', 'password' => 'abc']);
        $array = $cliente->toArray();

        $this->assertArrayNotHasKey('password', $array);
        $this->assertArrayNotHasKey('remember_token', $array);
    }
}
```

- [ ] **Step 5: Rodar testes**

```powershell
docker compose exec php php artisan test --filter=ClienteAuthTest
```

Esperado: 3 passed.

- [ ] **Step 6: Commit**

```powershell
git add database/migrations/2026_06_09_100004_add_auth_columns_to_clientes.php app/Models/Cliente.php tests/Feature/Sprint0/ClienteAuthTest.php
git commit -m "feat(auth): clientes ganha credenciais (email/senha) e implementa Authenticatable"
```

---

## Task 8: Roles e permissions de ecommerce (Spatie)

**Files:**
- Create: `database/seeders/EcommercePermissionSeeder.php`
- Create: `tests/Feature/Sprint0/EcommercePermissionsTest.php`

- [ ] **Step 1: Criar seeder**

`database/seeders/EcommercePermissionSeeder.php`:

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class EcommercePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'loja.pedidos.ver',
            'loja.pedidos.gerenciar',
            'loja.catalogo.editar',
            'loja.cupons.gerenciar',
            'loja.devolucoes.gerenciar',
            'loja.configuracoes.editar',
            'loja.banners.gerenciar',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        $admin = Role::firstOrCreate(['name' => 'admin_loja', 'guard_name' => 'web']);
        $admin->syncPermissions($permissions);

        $operador = Role::firstOrCreate(['name' => 'operador_loja', 'guard_name' => 'web']);
        $operador->syncPermissions([
            'loja.pedidos.ver',
            'loja.pedidos.gerenciar',
            'loja.devolucoes.gerenciar',
        ]);
    }
}
```

- [ ] **Step 2: Rodar seeder no banco de dev**

```powershell
docker compose exec php php artisan db:seed --class=EcommercePermissionSeeder
```

Verificar:

```powershell
docker compose exec php php artisan tinker --execute="echo Spatie\Permission\Models\Role::where('name','admin_loja')->first()->permissions->count();"
```

Esperado: `7`.

- [ ] **Step 3: Escrever teste**

Criar `tests/Feature/Sprint0/EcommercePermissionsTest.php`:

```php
<?php

namespace Tests\Feature\Sprint0;

use Database\Seeders\EcommercePermissionSeeder;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EcommercePermissionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_creates_loja_roles_with_expected_permissions(): void
    {
        $this->seed(PermissionSeeder::class);
        $this->seed(EcommercePermissionSeeder::class);

        $admin = Role::where('name', 'admin_loja')->first();
        $this->assertNotNull($admin);
        $this->assertSame(7, $admin->permissions->count());

        $operador = Role::where('name', 'operador_loja')->first();
        $this->assertNotNull($operador);
        $this->assertTrue($operador->hasPermissionTo('loja.pedidos.ver'));
        $this->assertFalse($operador->hasPermissionTo('loja.configuracoes.editar'));
    }
}
```

(O `PermissionSeeder::class` é o existente do PDV — invocado primeiro caso ele crie tabelas/role base.)

- [ ] **Step 4: Rodar testes**

```powershell
docker compose exec php php artisan test --filter=EcommercePermissionsTest
```

Esperado: 1 passed.

- [ ] **Step 5: Commit**

```powershell
git add database/seeders/EcommercePermissionSeeder.php tests/Feature/Sprint0/EcommercePermissionsTest.php
git commit -m "feat(rbac): roles admin_loja e operador_loja com permissions de ecommerce"
```

---

## Task 9: Regressão do PDV (não quebrou nada) + smoke checklist

**Files:**
- Create: `docs/superpowers/plans/sprint-0-smoke.md`

- [ ] **Step 1: Rodar a suíte de testes completa**

```powershell
docker compose exec php php artisan test
```

Esperado: todos os testes passando. Se um teste pré-existente quebrar, **parar** e investigar — provavelmente alguma trait/scope quebrou uma query do PDV (provável culpado: `BelongsToEmpresa` em queries que já filtram).

- [ ] **Step 2: Smoke manual do PDV**

Abrir `http://localhost:8000`, logar, e seguir a checklist:

1. Login funciona
2. Tela do PDV abre e lista produtos
3. Buscar produto por código de barras / nome
4. Adicionar produto à venda
5. Finalizar venda em dinheiro
6. Conferir movimentação de estoque (Estoque > histórico)
7. Lançar conta a pagar/receber
8. Abrir relatório de vendas do dia

Se algum item falhar: registrar exatamente o erro, reverter o commit suspeito, refazer com a correção.

- [ ] **Step 3: Criar checklist persistente**

`docs/superpowers/plans/sprint-0-smoke.md`:

```markdown
# Sprint 0 — Smoke do PDV (pré e pós-refator)

Rodar antes de mergear e depois de cada deploy de Sprint subsequente.

## Setup
1. Banco resetado: `docker compose exec php php artisan migrate:fresh --seed`
2. Subir stack: `docker compose up -d`

## Checklist
- [ ] Login admin (`admin@shopets.local` / senha do seeder)
- [ ] PDV abre e lista produtos
- [ ] Buscar produto por nome/código
- [ ] Adicionar à venda, conferir subtotal
- [ ] Finalizar em dinheiro, conferir troco
- [ ] Movimentação aparece em Estoque > histórico
- [ ] Conta a pagar criada vira lançamento no fluxo de caixa
- [ ] Conta a receber lançada quando recebida
- [ ] Cupom da última venda imprime/visualiza

## Resultado
Data | Executor | Status (OK / lista de falhas)
--- | --- | ---
2026-06-09 | _ | _
```

- [ ] **Step 4: Commit**

```powershell
git add docs/superpowers/plans/sprint-0-smoke.md
git commit -m "docs: checklist de smoke do PDV para sprint 0"
```

---

## Critérios de pronto da Sprint 0

- [x] Stack Docker sobe (`docker compose up -d`) e o PDV abre em `localhost:8000`
- [x] `php artisan test` passa 100% verde
- [x] Smoke manual do PDV completo, sem regressões
- [x] Tabela `personal_access_tokens` existe; `/sanctum/csrf-cookie` responde 204
- [x] CORS aceita `Origin: http://localhost:3000` com `Access-Control-Allow-Credentials: true`
- [x] `app/Domain/{Catalog,Cart,Checkout,Order,Shipping,Payment,Fiscal}/README.md` existem
- [x] `id_empresa` presente em `produtos`, `categorias`, `clientes`; global scope filtra por empresa atual
- [x] `produtos` tem todas as colunas de ecommerce + FULLTEXT (em MySQL); 50 produtos seedados têm `slug` preenchido
- [x] `categorias` tem novas colunas; categorias seedadas têm `slug` preenchido
- [x] `clientes` tem credenciais e implementa `Authenticatable`; senhas são hash bcrypt
- [x] Roles `admin_loja` e `operador_loja` criados com permissions de ecommerce
- [x] Tudo commitado em commits granulares (1 por task)

A Sprint 1 (Catálogo público + API + Storefront leitura) começa a partir daqui.
