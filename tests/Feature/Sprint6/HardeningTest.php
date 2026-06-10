<?php

namespace Tests\Feature\Sprint6;

use App\Models\Cliente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_endpoint_cupom_aplica_rate_limit(): void
    {
        $cliente = Cliente::factory()->create();
        \App\Models\Carrinho::create(['id_cliente' => $cliente->id_cliente]);
        Sanctum::actingAs($cliente);

        $status = 200;
        // Throttle de 20/min em cupom; estoura ao ultrapassar.
        for ($i = 0; $i < 25; $i++) {
            $resp = $this->postJson('/api/v1/carrinho/cupom', ['codigo' => 'NAOEXISTE']);
            $status = $resp->getStatusCode();
            if ($status === 429) {
                break;
            }
        }

        $this->assertSame(429, $status, 'Esperava 429 após exceder o limite.');
    }
}
