# Ecommerce — Sprint 1a (Backend & API pública) Implementation Plan

> **For agentic workers:** Execução via superpowers:subagent-driven-development.

**Goal:** Expor o catálogo (produtos, categorias, busca) para o futuro storefront Remix via API REST pública versionada (`/api/v1/*`), incluindo variações de produto (1 produto → N variações com SKU/preço/estoque próprios). Sem UI nova.

**Architecture:** Endpoints em `app/Http/Controllers/Api/V1/Storefront/*`, resources em `app/Http/Resources/V1/*`, models em `app/Models/*`. Sem autenticação nos endpoints públicos (catálogo é público). Busca usa MySQL FULLTEXT criado na Sprint 0 (fallback LIKE no SQLite dos testes).

**Tech Stack:** Laravel 12, PHP 8.2+, MySQL 8, PHPUnit 11.

**Spec:** [docs/superpowers/specs/2026-06-09-ecommerce-design.md](../specs/2026-06-09-ecommerce-design.md), Sprint 1 (seção 8).

**Branch:** `ecommerce-sprint-1` (a partir de `ecommerce-sprint-0`).

**Ajustes vs spec original da Sprint 1:**
- UI de variações no admin **deferida pra Sprint 5** (admin/loja/catalogo). Aqui apenas o modelo de dados + seed.
- Frontend Remix sai em sub-sprint **1b** separada.

---

## File Structure

```
shopets/
├── app/
│   ├── Models/
│   │   └── ProdutoVariacao.php                                  (criar)
│   ├── Models/Produto.php                                       (modificar — relação variacoes())
│   ├── Http/
│   │   ├── Controllers/Api/V1/Storefront/
│   │   │   ├── ProdutoController.php                            (criar)
│   │   │   ├── CategoriaController.php                          (criar)
│   │   │   └── BuscaController.php                              (criar)
│   │   └── Resources/V1/
│   │       ├── ProdutoListaResource.php                         (criar)
│   │       ├── ProdutoDetalheResource.php                       (criar)
│   │       ├── CategoriaResource.php                            (criar)
│   │       └── VariacaoResource.php                             (criar)
│   └── Domain/Catalog/
│       └── BuscaProdutoService.php                              (criar — FULLTEXT vs LIKE)
├── database/
│   ├── migrations/
│   │   └── 2026_06_09_110001_create_produto_variacoes_table.php (criar)
│   └── seeders/
│       ├── EnriquecerCatalogoCapasSeeder.php                    (criar — peso/dim/visivel)
│       └── VariacoesCapasSeeder.php                             (criar — variações em 5 produtos)
├── routes/
│   └── api.php                                                  (modificar — rotas /api/v1/*)
├── tests/Feature/Sprint1/
│   ├── ApiProdutosListagemTest.php                              (criar)
│   ├── ApiProdutoDetalheTest.php                                (criar)
│   ├── ApiCategoriasTest.php                                    (criar)
│   ├── ApiBuscaTest.php                                         (criar)
│   └── ProdutoVariacaoTest.php                                  (criar)
└── docs/superpowers/plans/
    └── 2026-06-09-ecommerce-sprint-1a-backend.md                (este arquivo)
```

---

## Task 1: Tabela e Model `produto_variacoes`

**Files:**
- Create: `database/migrations/2026_06_09_110001_create_produto_variacoes_table.php`
- Create: `app/Models/ProdutoVariacao.php`
- Modify: `app/Models/Produto.php` (acrescentar `variacoes()`)
- Create: `tests/Feature/Sprint1/ProdutoVariacaoTest.php`

- [ ] **Step 1: Criar migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('produto_variacoes', function (Blueprint $table) {
            $table->id('id_variacao');
            $table->foreignId('id_produto')->constrained('produtos', 'id_produto')->cascadeOnDelete();
            $table->string('sku', 60)->unique();
            $table->string('nome_variacao', 150);
            $table->json('atributos')->nullable();
            $table->decimal('preco_venda', 10, 2);
            $table->decimal('preco_promocional', 10, 2)->nullable();
            $table->decimal('estoque_atual', 10, 3)->default(0);
            $table->decimal('estoque_minimo', 10, 3)->default(0);
            $table->unsignedInteger('peso_gramas')->nullable();
            $table->decimal('altura_cm', 6, 2)->nullable();
            $table->decimal('largura_cm', 6, 2)->nullable();
            $table->decimal('comprimento_cm', 6, 2)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['id_produto', 'ativo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produto_variacoes');
    }
};
```

- [ ] **Step 2: Criar model**

`app/Models/ProdutoVariacao.php`:
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProdutoVariacao extends Model
{
    use HasFactory;

    protected $table = 'produto_variacoes';
    protected $primaryKey = 'id_variacao';

    protected $fillable = [
        'id_produto', 'sku', 'nome_variacao', 'atributos',
        'preco_venda', 'preco_promocional',
        'estoque_atual', 'estoque_minimo',
        'peso_gramas', 'altura_cm', 'largura_cm', 'comprimento_cm',
        'ativo',
    ];

    protected $casts = [
        'atributos' => 'array',
        'preco_venda' => 'decimal:2',
        'preco_promocional' => 'decimal:2',
        'estoque_atual' => 'decimal:3',
        'estoque_minimo' => 'decimal:3',
        'ativo' => 'boolean',
    ];

    public function produto()
    {
        return $this->belongsTo(Produto::class, 'id_produto', 'id_produto');
    }

    public function scopeAtivas($query)
    {
        return $query->where('ativo', true);
    }

    public function precoEfetivo(): float
    {
        return (float) ($this->preco_promocional ?? $this->preco_venda);
    }
}
```

- [ ] **Step 3: Acrescentar relação em `Produto`**

Em `app/Models/Produto.php`, adicionar método:
```php
public function variacoes()
{
    return $this->hasMany(ProdutoVariacao::class, 'id_produto', 'id_produto');
}

public function temVariacoes(): bool
{
    return $this->variacoes()->ativas()->exists();
}
```

- [ ] **Step 4: Rodar migration**

```
php artisan migrate
```

- [ ] **Step 5: Escrever testes**

`tests/Feature/Sprint1/ProdutoVariacaoTest.php`:
```php
<?php

namespace Tests\Feature\Sprint1;

use App\Models\Categoria;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProdutoVariacaoTest extends TestCase
{
    use RefreshDatabase;

    public function test_produto_pode_ter_multiplas_variacoes(): void
    {
        $cat = Categoria::create(['nome' => 'Capas', 'ativo' => true]);
        $produto = Produto::create([
            'nome' => 'Capa Genérica', 'preco_custo' => 5, 'preco_venda' => 15,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);

        ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'CAP-PRE',
            'nome_variacao' => 'Preta', 'atributos' => ['cor' => 'preta'],
            'preco_venda' => 15, 'estoque_atual' => 10,
        ]);
        ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'CAP-AZU',
            'nome_variacao' => 'Azul', 'atributos' => ['cor' => 'azul'],
            'preco_venda' => 15, 'estoque_atual' => 5,
        ]);

        $this->assertCount(2, $produto->fresh()->variacoes);
        $this->assertTrue($produto->fresh()->temVariacoes());
    }

    public function test_sku_e_unico(): void
    {
        $cat = Categoria::create(['nome' => 'Capas', 'ativo' => true]);
        $produto = Produto::create([
            'nome' => 'X', 'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);

        ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'DUP',
            'nome_variacao' => 'A', 'preco_venda' => 1,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'DUP',
            'nome_variacao' => 'B', 'preco_venda' => 1,
        ]);
    }

    public function test_preco_efetivo_usa_promocional_quando_existe(): void
    {
        $cat = Categoria::create(['nome' => 'C', 'ativo' => true]);
        $produto = Produto::create([
            'nome' => 'P', 'preco_custo' => 1, 'preco_venda' => 2,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
        ]);

        $v = ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'P1',
            'nome_variacao' => 'V', 'preco_venda' => 30, 'preco_promocional' => 19.90,
        ]);

        $this->assertSame(19.90, $v->precoEfetivo());
    }
}
```

- [ ] **Step 6: Rodar testes + commit**

```
php artisan test --filter=ProdutoVariacaoTest
```
Esperado: 3 passed.

```
git add -A
git commit -m "feat(catalog): tabela produto_variacoes + model + relacao com Produto"
```

---

## Task 2: Enriquecer os 50 produtos seedados

**Files:**
- Create: `database/seeders/EnriquecerCatalogoCapasSeeder.php`
- Create: `database/seeders/VariacoesCapasSeeder.php`

Estes seeders são idempotentes e rodam sobre o catálogo seedado na conversa anterior (CapasProdutoSeeder).

- [ ] **Step 1: EnriquecerCatalogoCapasSeeder — preenche peso/dim e marca visível**

`database/seeders/EnriquecerCatalogoCapasSeeder.php`:
```php
<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Database\Seeder;

class EnriquecerCatalogoCapasSeeder extends Seeder
{
    public function run(): void
    {
        // Defaults sensatos por categoria (peso e dimensões de embalagem)
        $defaults = [
            'Capas para Celular'      => ['peso' => 80,  'a' => 18, 'l' => 10, 'c' => 2],
            'Películas e Protetores'  => ['peso' => 30,  'a' => 20, 'l' => 12, 'c' => 1],
            'Carregadores'            => ['peso' => 150, 'a' => 12, 'l' => 8,  'c' => 5],
            'Cabos USB'               => ['peso' => 60,  'a' => 18, 'l' => 12, 'c' => 3],
            'Fones de Ouvido'         => ['peso' => 120, 'a' => 18, 'l' => 14, 'c' => 6],
            'Caixas de Som Bluetooth' => ['peso' => 350, 'a' => 22, 'l' => 18, 'c' => 10],
            'Suportes e Acessórios'   => ['peso' => 90,  'a' => 18, 'l' => 12, 'c' => 4],
            'Power Banks'             => ['peso' => 280, 'a' => 18, 'l' => 14, 'c' => 5],
        ];

        foreach ($defaults as $catNome => $d) {
            $cat = Categoria::where('nome', $catNome)->first();
            if (! $cat) {
                continue;
            }

            Produto::where('id_categoria', $cat->id_categoria)
                ->each(function (Produto $p) use ($d) {
                    $p->peso_gramas ??= $d['peso'];
                    $p->altura_cm ??= $d['a'];
                    $p->largura_cm ??= $d['l'];
                    $p->comprimento_cm ??= $d['c'];
                    $p->visivel_ecommerce = true;
                    $p->descricao_curta ??= mb_substr($p->nome, 0, 200);
                    $p->meta_title ??= $p->nome;
                    $p->meta_description ??= 'Compre '.$p->nome.' com entrega rápida e garantia.';
                    $p->save();
                });
        }
    }
}
```

- [ ] **Step 2: VariacoesCapasSeeder — adiciona variações de cor em 5 capas**

`database/seeders/VariacoesCapasSeeder.php`:
```php
<?php

namespace Database\Seeders;

use App\Models\Produto;
use App\Models\ProdutoVariacao;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class VariacoesCapasSeeder extends Seeder
{
    public function run(): void
    {
        $alvos = [
            'Capa Silicone iPhone 15',
            'Capa Silicone iPhone 15 Pro Max',
            'Capa Silicone Samsung Galaxy S24',
            'Capa Anti Impacto Galaxy S23 Ultra',
            'Capa Silicone Xiaomi Redmi Note 13',
        ];

        $cores = ['Preta', 'Azul', 'Rosa', 'Transparente'];

        foreach ($alvos as $nome) {
            $produto = Produto::where('nome', $nome)->first();
            if (! $produto || $produto->variacoes()->exists()) {
                continue;
            }

            foreach ($cores as $i => $cor) {
                ProdutoVariacao::create([
                    'id_produto'    => $produto->id_produto,
                    'sku'           => Str::slug($produto->codigo_interno.'-'.substr($cor, 0, 3), '_'),
                    'nome_variacao' => "$nome — $cor",
                    'atributos'     => ['cor' => $cor],
                    'preco_venda'   => $produto->preco_venda,
                    'preco_promocional' => $produto->preco_promocional,
                    'estoque_atual' => 5,
                    'estoque_minimo' => 1,
                    'peso_gramas'   => $produto->peso_gramas,
                    'altura_cm'     => $produto->altura_cm,
                    'largura_cm'    => $produto->largura_cm,
                    'comprimento_cm'=> $produto->comprimento_cm,
                    'ativo'         => true,
                ]);
            }
        }
    }
}
```

- [ ] **Step 3: Rodar seeders**

```
php artisan db:seed --class=EnriquecerCatalogoCapasSeeder
php artisan db:seed --class=VariacoesCapasSeeder
```

- [ ] **Step 4: Verificar**

```
php artisan tinker --execute="echo App\Models\Produto::where('visivel_ecommerce', true)->count().' visiveis, '.App\Models\ProdutoVariacao::count().' variacoes';"
```
Esperado: `50 visiveis, 20 variacoes` (5 produtos × 4 cores).

- [ ] **Step 5: Commit**

```
git add -A
git commit -m "feat(catalog): enriquece 50 capas (peso/dim/visivel) e adiciona variacoes de cor"
```

---

## Task 3: API Resources

**Files:**
- Create: `app/Http/Resources/V1/CategoriaResource.php`
- Create: `app/Http/Resources/V1/VariacaoResource.php`
- Create: `app/Http/Resources/V1/ProdutoListaResource.php`
- Create: `app/Http/Resources/V1/ProdutoDetalheResource.php`

- [ ] **Step 1: CategoriaResource**

```php
<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class CategoriaResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'        => $this->id_categoria,
            'nome'      => $this->nome,
            'slug'      => $this->slug,
            'imagem'    => $this->imagem_path,
            'ordem'     => (int) $this->ordem,
            'pai_id'    => $this->id_categoria_pai,
            'descricao' => $this->descricao,
        ];
    }
}
```

- [ ] **Step 2: VariacaoResource**

```php
<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class VariacaoResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'              => $this->id_variacao,
            'sku'             => $this->sku,
            'nome'            => $this->nome_variacao,
            'atributos'       => $this->atributos ?? [],
            'preco_venda'     => (float) $this->preco_venda,
            'preco_promocional' => $this->preco_promocional !== null ? (float) $this->preco_promocional : null,
            'preco_efetivo'   => $this->precoEfetivo(),
            'disponivel'      => (float) $this->estoque_atual > 0 && $this->ativo,
        ];
    }
}
```

- [ ] **Step 3: ProdutoListaResource (resumido para listagens)**

```php
<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class ProdutoListaResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                 => $this->id_produto,
            'slug'               => $this->slug,
            'nome'               => $this->nome,
            'descricao_curta'    => $this->descricao_curta,
            'preco_venda'        => (float) $this->preco_venda,
            'preco_promocional'  => $this->preco_promocional !== null ? (float) $this->preco_promocional : null,
            'em_promocao'        => (bool) $this->em_promocao,
            'novo'               => (bool) $this->novo,
            'destaque'           => (bool) $this->destaque,
            'categoria' => $this->whenLoaded('categoria', fn () => [
                'nome' => $this->categoria->nome,
                'slug' => $this->categoria->slug,
            ]),
            'imagem_capa'        => $this->getImageUrl('medium'),
            'tem_variacoes'      => $this->relationLoaded('variacoes') ? $this->variacoes->isNotEmpty() : null,
        ];
    }
}
```

- [ ] **Step 4: ProdutoDetalheResource (PDP)**

```php
<?php

namespace App\Http\Resources\V1;

use Illuminate\Http\Resources\Json\JsonResource;

class ProdutoDetalheResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'                 => $this->id_produto,
            'slug'               => $this->slug,
            'nome'               => $this->nome,
            'descricao_curta'    => $this->descricao_curta,
            'descricao_longa'    => $this->descricao_longa,
            'preco_venda'        => (float) $this->preco_venda,
            'preco_promocional'  => $this->preco_promocional !== null ? (float) $this->preco_promocional : null,
            'em_promocao'        => (bool) $this->em_promocao,
            'novo'               => (bool) $this->novo,
            'destaque'           => (bool) $this->destaque,
            'peso_gramas'        => $this->peso_gramas,
            'dimensoes_cm'       => [
                'altura'      => $this->altura_cm !== null ? (float) $this->altura_cm : null,
                'largura'     => $this->largura_cm !== null ? (float) $this->largura_cm : null,
                'comprimento' => $this->comprimento_cm !== null ? (float) $this->comprimento_cm : null,
            ],
            'seo' => [
                'title'       => $this->meta_title ?? $this->nome,
                'description' => $this->meta_description,
                'og_image'    => $this->og_image_path ?? $this->getImageUrl('large'),
            ],
            'categoria' => $this->whenLoaded('categoria', fn () =>
                new CategoriaResource($this->categoria)
            ),
            'galeria' => $this->getMedia('images')->map(fn ($m) => [
                'url'        => $m->getUrl(),
                'url_medium' => $m->getUrl('medium'),
                'url_large'  => $m->getUrl('large'),
            ])->all(),
            'variacoes' => VariacaoResource::collection($this->whenLoaded('variacoes')),
        ];
    }
}
```

- [ ] **Step 5: Commit (sem teste isolado; testes vêm nas próximas tasks)**

```
git add -A
git commit -m "feat(api): API Resources V1 (Categoria, Variacao, ProdutoLista, ProdutoDetalhe)"
```

---

## Task 4: Endpoint de listagem de produtos

**Files:**
- Create: `app/Http/Controllers/Api/V1/Storefront/ProdutoController.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/Sprint1/ApiProdutosListagemTest.php`

- [ ] **Step 1: Controller**

```php
<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ProdutoDetalheResource;
use App\Http\Resources\V1\ProdutoListaResource;
use App\Models\Produto;
use Illuminate\Http\Request;

class ProdutoController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->integer('por_pagina', 24);
        $perPage = max(1, min(100, $perPage));

        $query = Produto::query()
            ->where('visivel_ecommerce', true)
            ->where('ativo', true)
            ->with(['categoria', 'variacoes' => fn ($q) => $q->ativas()]);

        if ($request->filled('categoria')) {
            $slug = $request->string('categoria');
            $query->whereHas('categoria', fn ($q) => $q->where('slug', $slug));
        }

        if ($request->boolean('em_promocao')) {
            $query->where('em_promocao', true);
        }

        if ($request->boolean('destaque')) {
            $query->where('destaque', true);
        }

        if ($request->filled('preco_min')) {
            $query->where('preco_venda', '>=', $request->float('preco_min'));
        }

        if ($request->filled('preco_max')) {
            $query->where('preco_venda', '<=', $request->float('preco_max'));
        }

        match ($request->string('ordem')->toString()) {
            'preco_asc'  => $query->orderBy('preco_venda'),
            'preco_desc' => $query->orderByDesc('preco_venda'),
            'nome'       => $query->orderBy('nome'),
            'novidades'  => $query->orderByDesc('created_at'),
            default      => $query->orderByDesc('destaque')->orderByDesc('novo')->orderBy('nome'),
        };

        return ProdutoListaResource::collection($query->paginate($perPage));
    }

    public function show(string $slug)
    {
        $produto = Produto::query()
            ->where('slug', $slug)
            ->where('visivel_ecommerce', true)
            ->where('ativo', true)
            ->with(['categoria', 'variacoes' => fn ($q) => $q->ativas()])
            ->firstOrFail();

        return new ProdutoDetalheResource($produto);
    }
}
```

- [ ] **Step 2: Rotas em `routes/api.php`**

Acrescentar:
```php
Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::get('/produtos', [\App\Http\Controllers\Api\V1\Storefront\ProdutoController::class, 'index'])->name('produtos.index');
    Route::get('/produtos/{slug}', [\App\Http\Controllers\Api\V1\Storefront\ProdutoController::class, 'show'])->name('produtos.show');
});
```

- [ ] **Step 3: Teste de listagem**

`tests/Feature/Sprint1/ApiProdutosListagemTest.php`:
```php
<?php

namespace Tests\Feature\Sprint1;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiProdutosListagemTest extends TestCase
{
    use RefreshDatabase;

    private function criarCatalogoBase(): array
    {
        $cat = Categoria::create([
            'nome' => 'Capas', 'slug' => 'capas',
            'ativo' => true, 'visivel_ecommerce' => true,
        ]);

        Produto::create([
            'nome' => 'Capa Verde', 'slug' => 'capa-verde',
            'preco_custo' => 5, 'preco_venda' => 30,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
            'visivel_ecommerce' => true, 'ativo' => true, 'em_promocao' => false,
        ]);
        Produto::create([
            'nome' => 'Capa Vermelha', 'slug' => 'capa-vermelha',
            'preco_custo' => 5, 'preco_venda' => 50,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
            'visivel_ecommerce' => true, 'ativo' => true, 'em_promocao' => true,
        ]);
        Produto::create([
            'nome' => 'Capa Oculta', 'slug' => 'capa-oculta',
            'preco_custo' => 5, 'preco_venda' => 99,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
            'visivel_ecommerce' => false, 'ativo' => true,
        ]);

        return [$cat];
    }

    public function test_lista_apenas_produtos_visiveis_no_ecommerce(): void
    {
        $this->criarCatalogoBase();

        $response = $this->getJson('/api/v1/produtos');

        $response->assertOk()
            ->assertJsonCount(2, 'data');

        $slugs = collect($response->json('data'))->pluck('slug');
        $this->assertContains('capa-verde', $slugs);
        $this->assertContains('capa-vermelha', $slugs);
        $this->assertNotContains('capa-oculta', $slugs);
    }

    public function test_filtra_por_em_promocao(): void
    {
        $this->criarCatalogoBase();

        $response = $this->getJson('/api/v1/produtos?em_promocao=1');

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('capa-vermelha', $response->json('data.0.slug'));
    }

    public function test_filtra_por_faixa_de_preco(): void
    {
        $this->criarCatalogoBase();

        $response = $this->getJson('/api/v1/produtos?preco_min=40&preco_max=80');

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('capa-vermelha', $response->json('data.0.slug'));
    }

    public function test_ordena_por_preco_asc(): void
    {
        $this->criarCatalogoBase();

        $response = $this->getJson('/api/v1/produtos?ordem=preco_asc');

        $slugs = collect($response->json('data'))->pluck('slug')->all();
        $this->assertSame(['capa-verde', 'capa-vermelha'], $slugs);
    }

    public function test_pagina(): void
    {
        $this->criarCatalogoBase();

        $response = $this->getJson('/api/v1/produtos?por_pagina=1');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 2);
    }
}
```

- [ ] **Step 4: Rodar testes + commit**

```
php artisan test --filter=ApiProdutosListagemTest
```
Esperado: 5 passed.

```
git add -A
git commit -m "feat(api): GET /api/v1/produtos com filtros, ordenacao e paginacao"
```

---

## Task 5: Detalhe + busca + categorias

**Files:**
- Create: `app/Http/Controllers/Api/V1/Storefront/CategoriaController.php`
- Create: `app/Http/Controllers/Api/V1/Storefront/BuscaController.php`
- Create: `app/Domain/Catalog/BuscaProdutoService.php`
- Modify: `routes/api.php`
- Create: `tests/Feature/Sprint1/ApiProdutoDetalheTest.php`
- Create: `tests/Feature/Sprint1/ApiCategoriasTest.php`
- Create: `tests/Feature/Sprint1/ApiBuscaTest.php`

- [ ] **Step 1: CategoriaController**

```php
<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\CategoriaResource;
use App\Models\Categoria;

class CategoriaController extends Controller
{
    public function index()
    {
        $categorias = Categoria::query()
            ->where('ativo', true)
            ->where('visivel_ecommerce', true)
            ->orderBy('ordem')
            ->orderBy('nome')
            ->get();

        return CategoriaResource::collection($categorias);
    }
}
```

- [ ] **Step 2: BuscaProdutoService (FULLTEXT em MySQL, LIKE em SQLite)**

`app/Domain/Catalog/BuscaProdutoService.php`:
```php
<?php

namespace App\Domain\Catalog;

use App\Models\Produto;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class BuscaProdutoService
{
    public function buscar(string $termo): Builder
    {
        $termo = trim($termo);
        $query = Produto::query()
            ->where('visivel_ecommerce', true)
            ->where('ativo', true)
            ->with(['categoria']);

        if ($termo === '') {
            return $query;
        }

        if (DB::getDriverName() === 'mysql') {
            $query->whereRaw(
                'MATCH(nome, descricao_curta, descricao_longa) AGAINST(? IN NATURAL LANGUAGE MODE)',
                [$termo]
            );
        } else {
            $like = '%'.$termo.'%';
            $query->where(function ($q) use ($like) {
                $q->where('nome', 'like', $like)
                  ->orWhere('descricao_curta', 'like', $like)
                  ->orWhere('descricao_longa', 'like', $like);
            });
        }

        return $query;
    }
}
```

- [ ] **Step 3: BuscaController**

```php
<?php

namespace App\Http\Controllers\Api\V1\Storefront;

use App\Domain\Catalog\BuscaProdutoService;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ProdutoListaResource;
use Illuminate\Http\Request;

class BuscaController extends Controller
{
    public function __invoke(Request $request, BuscaProdutoService $service)
    {
        $termo = (string) $request->query('q', '');

        $perPage = (int) $request->integer('por_pagina', 24);
        $perPage = max(1, min(100, $perPage));

        $paginator = $service->buscar($termo)->paginate($perPage);

        return ProdutoListaResource::collection($paginator)
            ->additional(['termo' => $termo]);
    }
}
```

- [ ] **Step 4: Rotas em `routes/api.php`**

Acrescentar dentro do `prefix('v1')` existente:
```php
    Route::get('/categorias', [\App\Http\Controllers\Api\V1\Storefront\CategoriaController::class, 'index'])->name('categorias.index');
    Route::get('/busca', \App\Http\Controllers\Api\V1\Storefront\BuscaController::class)->name('busca');
```

- [ ] **Step 5: Teste de detalhe**

`tests/Feature/Sprint1/ApiProdutoDetalheTest.php`:
```php
<?php

namespace Tests\Feature\Sprint1;

use App\Models\Categoria;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiProdutoDetalheTest extends TestCase
{
    use RefreshDatabase;

    public function test_retorna_produto_com_variacoes_por_slug(): void
    {
        $cat = Categoria::create(['nome' => 'C', 'slug' => 'c', 'ativo' => true]);
        $produto = Produto::create([
            'nome' => 'Capa X', 'slug' => 'capa-x',
            'preco_custo' => 5, 'preco_venda' => 30,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
            'visivel_ecommerce' => true, 'ativo' => true,
        ]);
        ProdutoVariacao::create([
            'id_produto' => $produto->id_produto, 'sku' => 'X-PRE',
            'nome_variacao' => 'Preta', 'atributos' => ['cor' => 'Preta'],
            'preco_venda' => 30, 'estoque_atual' => 5, 'ativo' => true,
        ]);

        $response = $this->getJson('/api/v1/produtos/capa-x');

        $response->assertOk()
            ->assertJsonPath('data.slug', 'capa-x')
            ->assertJsonPath('data.categoria.slug', 'c')
            ->assertJsonCount(1, 'data.variacoes')
            ->assertJsonPath('data.variacoes.0.sku', 'X-PRE');
    }

    public function test_404_para_produto_oculto_no_ecommerce(): void
    {
        $cat = Categoria::create(['nome' => 'C', 'slug' => 'c', 'ativo' => true]);
        Produto::create([
            'nome' => 'Oculta', 'slug' => 'oculta',
            'preco_custo' => 5, 'preco_venda' => 30,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
            'visivel_ecommerce' => false, 'ativo' => true,
        ]);

        $this->getJson('/api/v1/produtos/oculta')->assertNotFound();
    }
}
```

- [ ] **Step 6: Teste de categorias**

`tests/Feature/Sprint1/ApiCategoriasTest.php`:
```php
<?php

namespace Tests\Feature\Sprint1;

use App\Models\Categoria;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiCategoriasTest extends TestCase
{
    use RefreshDatabase;

    public function test_lista_categorias_visiveis_ordenadas(): void
    {
        Categoria::create(['nome' => 'B', 'slug' => 'b', 'ordem' => 2, 'ativo' => true, 'visivel_ecommerce' => true]);
        Categoria::create(['nome' => 'A', 'slug' => 'a', 'ordem' => 1, 'ativo' => true, 'visivel_ecommerce' => true]);
        Categoria::create(['nome' => 'Z', 'slug' => 'z', 'ordem' => 3, 'ativo' => true, 'visivel_ecommerce' => false]);

        $response = $this->getJson('/api/v1/categorias');

        $response->assertOk()->assertJsonCount(2, 'data');
        $this->assertSame(['a', 'b'], collect($response->json('data'))->pluck('slug')->all());
    }
}
```

- [ ] **Step 7: Teste de busca**

`tests/Feature/Sprint1/ApiBuscaTest.php`:
```php
<?php

namespace Tests\Feature\Sprint1;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiBuscaTest extends TestCase
{
    use RefreshDatabase;

    private function semear(): void
    {
        $cat = Categoria::create(['nome' => 'C', 'slug' => 'c', 'ativo' => true]);
        Produto::create([
            'nome' => 'Capa de Silicone iPhone 15', 'slug' => 'capa-silicone-iphone-15',
            'descricao_curta' => 'Capa premium em silicone',
            'preco_custo' => 5, 'preco_venda' => 39.90,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
            'visivel_ecommerce' => true, 'ativo' => true,
        ]);
        Produto::create([
            'nome' => 'Carregador USB-C 20W', 'slug' => 'carregador-usb-c-20w',
            'descricao_curta' => 'Carregador rapido',
            'preco_custo' => 15, 'preco_venda' => 59.90,
            'unidade' => 'un', 'id_categoria' => $cat->id_categoria,
            'visivel_ecommerce' => true, 'ativo' => true,
        ]);
    }

    public function test_busca_por_termo_no_nome(): void
    {
        $this->semear();

        $response = $this->getJson('/api/v1/busca?q=silicone');

        $response->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame('capa-silicone-iphone-15', $response->json('data.0.slug'));
    }

    public function test_termo_vazio_retorna_todos_os_visiveis(): void
    {
        $this->semear();

        $response = $this->getJson('/api/v1/busca?q=');

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_response_inclui_termo(): void
    {
        $this->semear();

        $response = $this->getJson('/api/v1/busca?q=carregador');

        $response->assertJsonPath('termo', 'carregador');
    }
}
```

- [ ] **Step 8: Rodar testes + commit**

```
php artisan test --filter="Sprint1"
```
Esperado: todos verdes.

```
git add -A
git commit -m "feat(api): GET /api/v1/categorias, /produtos/{slug}, /busca (FULLTEXT em MySQL, LIKE em SQLite)"
```

---

## Task 6: Testes de integração + review final

- [ ] **Step 1: Rodar a suíte inteira pra checar regressão**

```
php artisan test 2>&1 | tail -5
```
Esperado: 52 → ~70+ passed (12 Sprint 0 + ~18-20 Sprint 1a); 6 falhas pré-existentes intactas.

- [ ] **Step 2: Smoke manual do API**

Subir `php artisan serve` em outro terminal e bater nos endpoints:
```
curl http://localhost:8000/api/v1/produtos | head -30
curl http://localhost:8000/api/v1/categorias
curl http://localhost:8000/api/v1/produtos/capa-silicone-iphone-15
curl "http://localhost:8000/api/v1/busca?q=silicone"
```

Conferir formato JSON.

- [ ] **Step 3: Disparar subagente de review final do branch ecommerce-sprint-1 vs ecommerce-sprint-0**

Critérios:
- Endpoints retornam só produtos com `visivel_ecommerce=true` e `ativo=true`
- Paginação Laravel padrão (`data`, `links`, `meta`)
- Sem N+1 nas listagens (with categorias/variacoes carregado)
- Resources não vazam campos internos (preco_custo, id_empresa, dados fiscais NCM/CEST)
- Sem rota /api/v1/* requerendo autenticação (catálogo é público)
- Smoke do PDV intacto

- [ ] **Step 4: Aplicar fixes do review (se houver) + commit final**

```
git log ecommerce-sprint-0..HEAD --oneline
```

## Critérios de pronto da Sprint 1a

- [ ] `produto_variacoes` criada; 20 variações seedadas (5 produtos × 4 cores)
- [ ] 50 produtos com peso/dim/visivel_ecommerce/SEO básico
- [ ] `GET /api/v1/produtos` paginado com filtros e ordenação
- [ ] `GET /api/v1/produtos/{slug}` com galeria + variações
- [ ] `GET /api/v1/categorias` ordenado
- [ ] `GET /api/v1/busca?q=...` FULLTEXT/LIKE
- [ ] Suite verde (Sprint 0 + Sprint 1a)
- [ ] Resources não vazam dados sensíveis (preço de custo, NCM, etc)
- [ ] Sem regressão no PDV (rotas + telas inalteradas)
