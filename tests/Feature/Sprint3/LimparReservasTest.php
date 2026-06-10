<?php

namespace Tests\Feature\Sprint3;

use App\Jobs\LimparReservasExpiradas;
use App\Models\Produto;
use App\Models\ReservaEstoque;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LimparReservasTest extends TestCase
{
    use RefreshDatabase;

    public function test_remove_expiradas_e_preserva_ativas_e_consumidas(): void
    {
        $produto = Produto::factory()->create(['estoque_atual' => 10]);

        $expirada = ReservaEstoque::create([
            'id_produto' => $produto->id_produto,
            'quantidade' => 1,
            'expira_em' => now()->subMinute(),
        ]);

        $ativa = ReservaEstoque::create([
            'id_produto' => $produto->id_produto,
            'quantidade' => 1,
            'expira_em' => now()->addMinutes(10),
        ]);

        $consumidaExpirada = ReservaEstoque::create([
            'id_produto' => $produto->id_produto,
            'quantidade' => 1,
            'expira_em' => now()->subMinute(),
            'consumida_em' => now()->subMinutes(2),
        ]);

        $removidas = (new LimparReservasExpiradas())->handle();

        $this->assertSame(1, $removidas);
        $this->assertDatabaseMissing('reservas_estoque', ['id_reserva' => $expirada->id_reserva]);
        $this->assertDatabaseHas('reservas_estoque', ['id_reserva' => $ativa->id_reserva]);
        $this->assertDatabaseHas('reservas_estoque', ['id_reserva' => $consumidaExpirada->id_reserva]);
    }
}
