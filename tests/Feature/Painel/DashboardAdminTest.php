<?php

namespace Tests\Feature\Painel;

use App\Models\Cliente;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardAdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
    }

    private function pedidoPago(float $total, string $quando): void
    {
        $cliente = Cliente::factory()->create();
        DB::table('pedidos')->insert([
            'numero' => 'PED-'.uniqid(),
            'id_cliente' => $cliente->id_cliente,
            'id_empresa' => 1,
            'status' => 'pago',
            'modalidade' => 'entrega',
            'subtotal' => $total,
            'total' => $total,
            'created_at' => $quando,
            'updated_at' => $quando,
        ]);
    }

    public function test_serie_vendas_agrega_por_dia(): void
    {
        $this->pedidoPago(100, now()->subDays(2)->toDateString().' 10:00:00');
        $this->pedidoPago(50, now()->subDays(2)->toDateString().' 14:00:00');

        $r = $this->getJson('/api/v1/painel/dashboard/serie-vendas?periodo=30d')->assertOk();
        $this->assertSame(150.0, (float) $r->json('data.0.total'));
        $this->assertArrayHasKey('comparacao', $r->json());
    }

    public function test_kpis_consolidados(): void
    {
        $this->pedidoPago(200, now()->subDay()->toDateString().' 09:00:00');

        $r = $this->getJson('/api/v1/painel/dashboard/kpis?periodo=30d')->assertOk();
        $this->assertSame(200.0, (float) $r->json('data.faturamento'));
        $this->assertSame(1, $r->json('data.pedidos'));
        $this->assertSame(200.0, (float) $r->json('data.ticket_medio'));
    }

    public function test_top_produtos_e_categorias_respondem(): void
    {
        $this->getJson('/api/v1/painel/dashboard/top-produtos')->assertOk()->assertJsonStructure(['data']);
        $this->getJson('/api/v1/painel/dashboard/top-categorias')->assertOk()->assertJsonStructure(['data']);
    }
}
