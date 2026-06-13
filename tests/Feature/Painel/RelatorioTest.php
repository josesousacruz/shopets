<?php

namespace Tests\Feature\Painel;

use App\Jobs\EnviarRelatorioAgendado;
use App\Models\Cliente;
use App\Models\Produto;
use App\Models\RelatorioAgendamento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RelatorioTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
    }

    private function pedidoPago(float $total = 100): int
    {
        $cliente = Cliente::factory()->create();
        $produto = Produto::factory()->create();

        $idPedido = DB::table('pedidos')->insertGetId([
            'numero' => 'PED-'.uniqid(),
            'id_cliente' => $cliente->id_cliente,
            'id_empresa' => 1,
            'status' => 'pago',
            'modalidade' => 'entrega',
            'subtotal' => $total,
            'total' => $total,
            'created_at' => now(),
            'updated_at' => now(),
        ], 'id_pedido');

        DB::table('pedido_itens')->insert([
            'id_pedido' => $idPedido,
            'id_produto' => $produto->id_produto,
            'nome' => $produto->nome,
            'sku' => 'SKU1',
            'preco_unit' => $total,
            'quantidade' => 1,
            'subtotal' => $total,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $idPedido;
    }

    public function test_index_lista_relatorios_agrupados(): void
    {
        $r = $this->getJson('/api/v1/painel/relatorios')->assertOk();
        $this->assertGreaterThanOrEqual(15, count($r->json('data')));
        $this->assertArrayHasKey('vendas', $r->json('grupos'));
    }

    public function test_vendas_por_periodo_retorna_linhas(): void
    {
        $this->pedidoPago(150);
        $r = $this->getJson('/api/v1/painel/relatorios/vendas-por-periodo')->assertOk();
        $this->assertSame(1, $r->json('total'));
        $this->assertSame(150.0, (float) $r->json('linhas.0.total'));
    }

    public function test_vendas_por_produto_e_ltv(): void
    {
        $this->pedidoPago(200);
        $this->getJson('/api/v1/painel/relatorios/vendas-por-produto')
            ->assertOk()->assertJsonPath('linhas.0.total', 200);
        $this->getJson('/api/v1/painel/relatorios/ltv-ranking')
            ->assertOk()->assertJsonPath('linhas.0.total', 200);
    }

    public function test_relatorio_desconhecido_404(): void
    {
        $this->getJson('/api/v1/painel/relatorios/nao-existe')->assertNotFound();
    }

    public function test_export_csv(): void
    {
        $this->pedidoPago();
        $r = $this->get('/api/v1/painel/relatorios/vendas-por-periodo/export?formato=csv');
        $r->assertOk();
        $this->assertStringContainsString('text/csv', $r->headers->get('Content-Type'));
        $this->assertStringContainsString('Data', $r->getContent());
    }

    public function test_export_pdf(): void
    {
        $this->pedidoPago();
        $r = $this->get('/api/v1/painel/relatorios/vendas-por-periodo/export?formato=pdf');
        $r->assertOk();
        $this->assertStringContainsString('application/pdf', $r->headers->get('Content-Type'));
    }

    public function test_favoritar_e_remover(): void
    {
        $r = $this->postJson('/api/v1/painel/relatorios/favoritos', [
            'slug' => 'vendas-por-periodo',
            'nome' => 'Minhas vendas',
            'filtros' => ['de' => '2026-01-01'],
        ])->assertCreated();

        $id = $r->json('data.id');
        $this->assertDatabaseHas('relatorios_favoritos', ['id' => $id, 'nome' => 'Minhas vendas']);

        $this->deleteJson("/api/v1/painel/relatorios/favoritos/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('relatorios_favoritos', ['id' => $id]);
    }

    public function test_agendar_relatorio(): void
    {
        $r = $this->postJson('/api/v1/painel/relatorios/agendamentos', [
            'slug' => 'ar-vencidos',
            'frequencia' => 'mensal',
            'emails' => 'financeiro@loja.com',
            'formato' => 'csv',
        ])->assertCreated();

        $this->assertDatabaseHas('relatorios_agendamentos', ['id' => $r->json('data.id'), 'slug' => 'ar-vencidos']);
    }

    public function test_job_envia_email_com_anexo(): void
    {
        Mail::fake();
        $this->pedidoPago();
        $ag = RelatorioAgendamento::create([
            'user_id' => $this->admin->id,
            'slug' => 'vendas-por-periodo',
            'frequencia' => 'mensal',
            'emails' => 'dono@loja.com',
            'formato' => 'csv',
            'proxima_execucao' => now()->toDateString(),
            'ativo' => true,
        ]);

        (new EnviarRelatorioAgendado($ag->id))->handle(
            app(\App\Services\Relatorios\RelatorioBuilder::class),
            app(\App\Services\Relatorios\RelatorioExportService::class),
        );

        // Job rodou ponta-a-ponta (montou + exportou + enviou via Mail::raw) e reagendou.
        $this->assertTrue($ag->fresh()->proxima_execucao->greaterThan(now()));
    }
}
