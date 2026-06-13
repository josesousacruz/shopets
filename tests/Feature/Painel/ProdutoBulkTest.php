<?php

namespace Tests\Feature\Painel;

use App\Models\Categoria;
use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProdutoBulkTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    public function test_bulk_status_desativa_produtos(): void
    {
        $a = Produto::factory()->create(['ativo' => true]);
        $b = Produto::factory()->create(['ativo' => true]);

        $this->postJson('/api/v1/painel/produtos/bulk', [
            'ids' => [$a->id_produto, $b->id_produto],
            'action' => 'status',
            'payload' => ['ativo' => false],
        ])->assertOk()->assertJsonPath('data.afetados', 2);

        $this->assertFalse($a->fresh()->ativo);
        $this->assertFalse($b->fresh()->ativo);
    }

    public function test_bulk_categoria(): void
    {
        $cat = Categoria::create(['nome' => 'Promoções', 'ativo' => true]);
        $p = Produto::factory()->create();

        $this->postJson('/api/v1/painel/produtos/bulk', [
            'ids' => [$p->id_produto],
            'action' => 'categoria',
            'payload' => ['id_categoria' => $cat->id_categoria],
        ])->assertOk();

        $this->assertSame($cat->id_categoria, $p->fresh()->id_categoria);
    }

    public function test_bulk_price_delta_percentual(): void
    {
        $p = Produto::factory()->create(['preco_venda' => 100]);

        $this->postJson('/api/v1/painel/produtos/bulk', [
            'ids' => [$p->id_produto],
            'action' => 'price_delta',
            'payload' => ['tipo' => 'percentual', 'valor' => 10],
        ])->assertOk();

        $this->assertSame('110.00', $p->fresh()->preco_venda);
    }

    public function test_bulk_valida_action(): void
    {
        $p = Produto::factory()->create();
        $this->postJson('/api/v1/painel/produtos/bulk', [
            'ids' => [$p->id_produto],
            'action' => 'invalido',
            'payload' => [],
        ])->assertStatus(422);
    }
}
