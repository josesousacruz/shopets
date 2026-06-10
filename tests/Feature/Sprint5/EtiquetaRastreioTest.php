<?php

namespace Tests\Feature\Sprint5;

use App\Domain\Shipping\GerarEtiquetaAction;
use App\Mail\PedidoEnviado;
use App\Models\Cliente;
use App\Models\Pedido;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EtiquetaRastreioTest extends TestCase
{
    use RefreshDatabase;

    private function pedido(string $status = 'em_separacao'): array
    {
        $cliente = Cliente::factory()->create();
        $pedido = Pedido::create([
            'numero' => Pedido::gerarNumero(),
            'id_cliente' => $cliente->id_cliente,
            'status' => $status,
            'modalidade' => 'entrega',
            'subtotal' => 50,
            'frete' => 10,
            'desconto' => 0,
            'total' => 60,
        ]);

        return [$cliente, $pedido];
    }

    public function test_gerar_etiqueta_define_url_e_evento_e_e_idempotente(): void
    {
        [, $pedido] = $this->pedido();

        $action = app(GerarEtiquetaAction::class);
        $url = $action->executar($pedido);

        $this->assertNotEmpty($url);
        $this->assertDatabaseHas('pedidos', [
            'id_pedido' => $pedido->id_pedido,
            'etiqueta_url' => $url,
        ]);
        $this->assertDatabaseHas('pedido_eventos', [
            'id_pedido' => $pedido->id_pedido,
            'tipo' => 'etiqueta_gerada',
        ]);

        // Idempotente: chamar de novo não duplica evento nem muda a URL.
        $url2 = $action->executar($pedido->fresh());
        $this->assertSame($url, $url2);
        $this->assertEquals(
            1,
            \App\Models\PedidoEvento::where('id_pedido', $pedido->id_pedido)
                ->where('tipo', 'etiqueta_gerada')
                ->count()
        );
    }

    public function test_endpoint_admin_gera_etiqueta(): void
    {
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
        [, $pedido] = $this->pedido();

        $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/etiqueta")
            ->assertOk()
            ->assertJsonPath('data.numero', $pedido->numero)
            ->assertJsonStructure(['data' => ['etiqueta_url']]);
    }

    public function test_enviar_com_rastreio_dispara_pedido_enviado_e_grava_codigo(): void
    {
        Mail::fake();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
        [$cliente, $pedido] = $this->pedido('em_separacao');

        $this->postJson("/api/v1/painel/pedidos/{$pedido->numero}/enviar", [
            'codigo_rastreio' => 'BR123456789XYZ',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'enviado')
            ->assertJsonPath('data.codigo_rastreio', 'BR123456789XYZ');

        $this->assertDatabaseHas('pedidos', [
            'id_pedido' => $pedido->id_pedido,
            'codigo_rastreio' => 'BR123456789XYZ',
        ]);

        Mail::assertQueued(PedidoEnviado::class, fn ($mail) => $mail->hasTo($cliente->email));
    }
}
