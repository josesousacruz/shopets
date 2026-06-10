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

        $response->assertOk()->assertJsonCount(2, 'data');

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
