<?php

namespace Tests\Feature\Sprint3;

use App\Models\Cliente;
use App\Models\Pedido;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PedidoTest extends TestCase
{
    use RefreshDatabase;

    private function pedidoPara(Cliente $cliente): Pedido
    {
        return Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => $cliente->id_cliente,
            'status' => 'aguardando_pagamento',
            'modalidade' => 'retirada',
            'subtotal' => 20,
            'frete' => 0,
            'desconto' => 0,
            'total' => 20,
        ]);
    }

    public function test_lista_pedidos_do_cliente(): void
    {
        $cliente = Cliente::factory()->create();
        $this->pedidoPara($cliente);

        Sanctum::actingAs($cliente);

        $this->getJson('/api/v1/pedidos')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_mostra_pedido_por_numero(): void
    {
        $cliente = Cliente::factory()->create();
        $pedido = $this->pedidoPara($cliente);

        Sanctum::actingAs($cliente);

        $this->getJson("/api/v1/pedidos/{$pedido->numero}")
            ->assertOk()
            ->assertJsonPath('data.numero', $pedido->numero);
    }

    public function test_pedido_de_outro_cliente_retorna_404(): void
    {
        $dono = Cliente::factory()->create();
        $outro = Cliente::factory()->create();
        $pedido = $this->pedidoPara($dono);

        Sanctum::actingAs($outro);

        $this->getJson("/api/v1/pedidos/{$pedido->numero}")
            ->assertNotFound();
    }
}
