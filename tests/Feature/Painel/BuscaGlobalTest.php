<?php

namespace Tests\Feature\Painel;

use App\Models\Cliente;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BuscaGlobalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    public function test_query_curta_retorna_vazia(): void
    {
        $r = $this->getJson('/api/v1/painel/busca?q=a')->assertOk();
        $this->assertSame([], $r->json('data.pedidos'));
        $this->assertSame([], $r->json('data.produtos'));
        $this->assertSame([], $r->json('data.clientes'));
    }

    public function test_busca_produto_por_nome(): void
    {
        Produto::factory()->create(['nome' => 'Camiseta Verde']);
        Produto::factory()->create(['nome' => 'Tênis Azul']);

        $r = $this->getJson('/api/v1/painel/busca?q=camiseta')->assertOk();
        $this->assertCount(1, $r->json('data.produtos'));
        $this->assertSame('Camiseta Verde', $r->json('data.produtos.0.nome'));
    }

    public function test_busca_cliente_por_email(): void
    {
        Cliente::factory()->create(['nome' => 'Joao', 'email' => 'joao@teste.com']);

        $r = $this->getJson('/api/v1/painel/busca?q=joao')->assertOk();
        $this->assertSame(1, count($r->json('data.clientes')));
    }
}
