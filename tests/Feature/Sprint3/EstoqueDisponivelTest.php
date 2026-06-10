<?php

namespace Tests\Feature\Sprint3;

use App\Domain\Order\EstoqueService;
use App\Models\Produto;
use App\Models\ProdutoVariacao;
use App\Models\ReservaEstoque;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EstoqueDisponivelTest extends TestCase
{
    use RefreshDatabase;

    private EstoqueService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(EstoqueService::class);
    }

    public function test_sem_reservas_disponivel_igual_estoque_atual(): void
    {
        $produto = Produto::factory()->create(['estoque_atual' => 10]);

        $this->assertSame(10.0, $this->service->disponivel($produto));
    }

    public function test_reserva_ativa_desconta_disponivel(): void
    {
        $produto = Produto::factory()->create(['estoque_atual' => 10]);

        ReservaEstoque::create([
            'id_produto' => $produto->id_produto,
            'quantidade' => 3,
            'expira_em' => now()->addMinutes(10),
        ]);

        $this->assertSame(7.0, $this->service->disponivel($produto));
        $this->assertSame(3.0, $this->service->reservado($produto));
    }

    public function test_reserva_expirada_nao_desconta(): void
    {
        $produto = Produto::factory()->create(['estoque_atual' => 10]);

        ReservaEstoque::create([
            'id_produto' => $produto->id_produto,
            'quantidade' => 4,
            'expira_em' => now()->subMinute(),
        ]);

        $this->assertSame(10.0, $this->service->disponivel($produto));
    }

    public function test_reserva_consumida_nao_desconta(): void
    {
        $produto = Produto::factory()->create(['estoque_atual' => 10]);

        ReservaEstoque::create([
            'id_produto' => $produto->id_produto,
            'quantidade' => 4,
            'expira_em' => now()->addMinutes(10),
            'consumida_em' => now(),
        ]);

        $this->assertSame(10.0, $this->service->disponivel($produto));
    }

    public function test_disponivel_por_variacao(): void
    {
        $variacao = ProdutoVariacao::factory()->create(['estoque_atual' => 8]);

        ReservaEstoque::create([
            'id_produto' => $variacao->id_produto,
            'id_variacao' => $variacao->id_variacao,
            'quantidade' => 2,
            'expira_em' => now()->addMinutes(10),
        ]);

        $this->assertSame(6.0, $this->service->disponivel($variacao));
    }
}
