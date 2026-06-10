<?php

namespace Tests\Feature\Sprint6;

use App\Domain\Cart\CarrinhoService;
use App\Models\Carrinho;
use App\Models\Cliente;
use App\Models\PagamentoPedido;
use App\Models\PontoVenda;
use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CheckoutRetiradaTest extends TestCase
{
    use RefreshDatabase;

    private function setupCarrinho(Cliente $cliente, float $preco = 50, int $qtd = 1): Carrinho
    {
        $produto = Produto::factory()->create(['estoque_atual' => 10, 'preco_venda' => $preco]);
        $carrinho = Carrinho::create(['id_cliente' => $cliente->id_cliente]);
        app(CarrinhoService::class)->adicionarItem($carrinho, $produto->id_produto, null, $qtd);

        return $carrinho->fresh();
    }

    public function test_retirada_online_nasce_aguardando_pagamento(): void
    {
        $cliente = Cliente::factory()->create();
        $pdv = PontoVenda::create(['nome_pdv' => 'Loja Retira', 'ativo' => true, 'permite_retirada' => true]);
        $carrinho = $this->setupCarrinho($cliente);

        Sanctum::actingAs($cliente);

        $resp = $this->withHeaders(['X-Cart-Token' => $carrinho->token])
            ->postJson('/api/v1/checkout/iniciar', [
                'modalidade' => 'retirada',
                'id_pdv' => $pdv->id_pdv,
                'pagamento_modo' => 'online',
            ])
            ->assertCreated();

        $numero = $resp->json('data.numero');
        $this->assertDatabaseHas('pedidos', [
            'numero' => $numero,
            'status' => 'aguardando_pagamento',
            'pagamento_modo' => 'online',
            'modalidade' => 'retirada',
            'id_ponto_venda_retirada' => $pdv->id_pdv,
        ]);
        $this->assertSame(0.0, (float) $resp->json('data.frete'));
    }

    public function test_retirada_na_retirada_nasce_aguardando_retirada_sem_pagamento(): void
    {
        $cliente = Cliente::factory()->create();
        $pdv = PontoVenda::create(['nome_pdv' => 'Loja Retira', 'ativo' => true, 'permite_retirada' => true]);
        $carrinho = $this->setupCarrinho($cliente);

        Sanctum::actingAs($cliente);

        $resp = $this->withHeaders(['X-Cart-Token' => $carrinho->token])
            ->postJson('/api/v1/checkout/iniciar', [
                'modalidade' => 'retirada',
                'id_pdv' => $pdv->id_pdv,
                'pagamento_modo' => 'na_retirada',
            ])
            ->assertCreated();

        $numero = $resp->json('data.numero');
        $this->assertDatabaseHas('pedidos', [
            'numero' => $numero,
            'status' => 'aguardando_retirada',
            'pagamento_modo' => 'na_retirada',
        ]);
        $pedido = \App\Models\Pedido::where('numero', $numero)->first();
        $this->assertSame(0, PagamentoPedido::where('id_pedido', $pedido->id_pedido)->count());
        // Reserva criada, estoque ainda não baixado.
        $this->assertDatabaseHas('reservas_estoque', ['id_pedido' => $pedido->id_pedido]);
    }

    public function test_retirada_exige_pdv_que_permite_retirada(): void
    {
        $cliente = Cliente::factory()->create();
        $pdv = PontoVenda::create(['nome_pdv' => 'Sem Retira', 'ativo' => true, 'permite_retirada' => false]);
        $carrinho = $this->setupCarrinho($cliente);

        Sanctum::actingAs($cliente);

        $this->withHeaders(['X-Cart-Token' => $carrinho->token])
            ->postJson('/api/v1/checkout/iniciar', [
                'modalidade' => 'retirada',
                'id_pdv' => $pdv->id_pdv,
                'pagamento_modo' => 'na_retirada',
            ])
            ->assertStatus(422);
    }
}
