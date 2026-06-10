<?php

namespace Tests\Feature\Sprint4;

use App\Models\PagamentoPedido;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PagamentoTest extends TestCase
{
    use RefreshDatabase, Sprint4Helpers;

    public function test_pagar_cria_cobranca_pix_pendente_com_qr(): void
    {
        $this->seedInfra();
        [$cliente, $pedido] = $this->pedidoComItem();

        Sanctum::actingAs($cliente);

        $resp = $this->postJson("/api/v1/pedidos/{$pedido->numero}/pagar", ['metodo' => 'pix']);

        $resp->assertCreated()
            ->assertJsonPath('status', 'pendente')
            ->assertJsonPath('metodo', 'pix');

        $this->assertNotEmpty($resp->json('pix_qr'));
        $this->assertNotEmpty($resp->json('pix_copia_cola'));
        $this->assertNotEmpty($resp->json('gateway_id'));

        $this->assertDatabaseHas('pagamentos_pedido', [
            'id_pedido' => $pedido->id_pedido,
            'status' => 'pendente',
            'metodo' => 'pix',
        ]);
    }

    public function test_pagar_pedido_ja_pago_retorna_200_idempotente(): void
    {
        $this->seedInfra();
        [$cliente, $pedido] = $this->pedidoComItem();
        $pedido->update(['status' => 'pago']);

        Sanctum::actingAs($cliente);

        $this->postJson("/api/v1/pedidos/{$pedido->numero}/pagar", ['metodo' => 'pix'])
            ->assertOk()
            ->assertJsonPath('status', 'pago');

        $this->assertEquals(0, PagamentoPedido::count());
    }

    public function test_pagar_pedido_de_outro_cliente_retorna_404(): void
    {
        $this->seedInfra();
        [, $pedido] = $this->pedidoComItem();
        $outro = \App\Models\Cliente::factory()->create();

        Sanctum::actingAs($outro);

        $this->postJson("/api/v1/pedidos/{$pedido->numero}/pagar", ['metodo' => 'pix'])
            ->assertNotFound();
    }
}
