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
