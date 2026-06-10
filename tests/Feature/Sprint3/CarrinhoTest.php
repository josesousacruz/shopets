<?php

namespace Tests\Feature\Sprint3;

use App\Domain\Cart\CarrinhoService;
use App\Models\Carrinho;
use App\Models\Cliente;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CarrinhoTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_carrinho_cria_e_retorna_token(): void
    {
        $resp = $this->getJson('/api/v1/carrinho');

        $resp->assertOk()
            ->assertJsonStructure(['data' => ['token', 'itens', 'subtotal', 'quantidade_total']]);

        $this->assertNotNull($resp->json('data.token'));
    }

    public function test_adicionar_item(): void
    {
        $produto = Produto::factory()->create(['estoque_atual' => 10, 'preco_venda' => 20]);
        $carrinho = Carrinho::create([]);

        $resp = $this->withHeaders(['X-Cart-Token' => $carrinho->token])
            ->postJson('/api/v1/carrinho/itens', [
                'id_produto' => $produto->id_produto,
                'quantidade' => 2,
            ]);

        $resp->assertCreated();
        $this->assertEquals(2, $resp->json('data.quantidade_total'));
        $this->assertEquals(40.0, $resp->json('data.subtotal'));
    }

    public function test_adicionar_incrementa_quantidade(): void
    {
        $produto = Produto::factory()->create(['estoque_atual' => 10]);
        $carrinho = Carrinho::create([]);

        $headers = ['X-Cart-Token' => $carrinho->token];
        $this->withHeaders($headers)->postJson('/api/v1/carrinho/itens', [
            'id_produto' => $produto->id_produto, 'quantidade' => 2,
        ])->assertCreated();

        $resp = $this->withHeaders($headers)->postJson('/api/v1/carrinho/itens', [
            'id_produto' => $produto->id_produto, 'quantidade' => 3,
        ]);

        $this->assertEquals(5, $resp->json('data.quantidade_total'));
        $this->assertCount(1, $resp->json('data.itens'));
    }

    public function test_nao_permite_exceder_disponivel(): void
    {
        $produto = Produto::factory()->create(['estoque_atual' => 3]);
        $carrinho = Carrinho::create([]);

        $this->withHeaders(['X-Cart-Token' => $carrinho->token])
            ->postJson('/api/v1/carrinho/itens', [
                'id_produto' => $produto->id_produto,
                'quantidade' => 5,
            ])
            ->assertStatus(422);
    }

    public function test_remover_item(): void
    {
        $produto = Produto::factory()->create(['estoque_atual' => 10]);
        $carrinho = Carrinho::create([]);
        $headers = ['X-Cart-Token' => $carrinho->token];

        $add = $this->withHeaders($headers)->postJson('/api/v1/carrinho/itens', [
            'id_produto' => $produto->id_produto, 'quantidade' => 1,
        ]);
        $itemId = $add->json('data.itens.0.id');

        $resp = $this->withHeaders($headers)->deleteJson("/api/v1/carrinho/itens/{$itemId}");

        $resp->assertOk();
        $this->assertEquals(0, $resp->json('data.quantidade_total'));
    }

    public function test_merge_guest_para_cliente_no_login(): void
    {
        $produto = Produto::factory()->create(['estoque_atual' => 10]);
        $cliente = Cliente::factory()->create();

        // Carrinho guest com item.
        $guest = Carrinho::create([]);
        $service = app(CarrinhoService::class);
        $service->adicionarItem($guest, $produto->id_produto, null, 2);

        // Cliente resolve passando o token do guest -> merge.
        $resolvido = $service->resolver($cliente, $guest->token);

        $this->assertEquals($cliente->id_cliente, $resolvido->id_cliente);
        $this->assertEquals(2, $resolvido->quantidadeTotal());
        $this->assertDatabaseMissing('carrinhos', ['id_carrinho' => $guest->id_carrinho]);
    }
}
