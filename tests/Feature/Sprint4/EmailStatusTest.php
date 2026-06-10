<?php

namespace Tests\Feature\Sprint4;

use App\Domain\Order\MarcarPedidoPagoAction;
use App\Mail\PagamentoConfirmado;
use App\Models\PagamentoPedido;
use App\Services\NfceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailStatusTest extends TestCase
{
    use RefreshDatabase, Sprint4Helpers;

    public function test_marcar_pago_dispara_email_pagamento_confirmado(): void
    {
        Mail::fake();
        $this->mock(NfceService::class, function ($mock) {
            $mock->shouldReceive('emitir')->andReturn(['chave' => 'X', 'numero' => '1']);
        });

        $this->seedInfra();
        [$cliente, $pedido] = $this->pedidoComItem(modalidade: 'retirada');

        PagamentoPedido::create([
            'id_pedido' => $pedido->id_pedido,
            'gateway' => 'fake',
            'gateway_id_externo' => 'fake_'.$pedido->id_pedido,
            'metodo' => 'pix',
            'status' => 'aprovado',
            'valor' => 40,
        ]);

        app(MarcarPedidoPagoAction::class)->executar($pedido);

        // Mailable é ShouldQueue: com Mail::fake fica registrado como "queued".
        Mail::assertQueued(PagamentoConfirmado::class, fn ($mail) => $mail->hasTo($cliente->email));
    }
}
