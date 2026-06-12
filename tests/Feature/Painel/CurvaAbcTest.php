<?php

namespace Tests\Feature\Painel;

use App\Models\Produto;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CurvaAbcTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create(['nivel_acesso' => 'admin']));
    }

    private function venda(): int
    {
        $userId = User::factory()->create()->id;
        $pdvId = DB::table('pontos_venda')->insertGetId([
            'nome_pdv' => 'Loja Teste',
            'ativo' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('vendas')->insertGetId([
            'numero_venda' => 'V-'.uniqid(),
            'id_usuario' => $userId,
            'id_pdv' => $pdvId,
            'data_venda' => now(),
            'valor_subtotal' => 0,
            'valor_desconto' => 0,
            'valor_acrescimo' => 0,
            'valor_total' => 0,
            'status' => 'finalizada',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function vendeItem(int $vendaId, int $produtoId, float $qtd, float $totalItem, ?\DateTimeInterface $em = null): void
    {
        DB::table('itens_venda')->insert([
            'id_venda' => $vendaId,
            'id_produto' => $produtoId,
            'quantidade' => $qtd,
            'preco_unitario' => $totalItem / max($qtd, 1),
            'desconto_item' => 0,
            'valor_total_item' => $totalItem,
            'created_at' => $em ?? now(),
            'updated_at' => $em ?? now(),
        ]);
    }

    public function test_classifica_a_b_c_corretamente(): void
    {
        $venda = $this->venda();

        // 3 produtos: 80 / 15 / 5 do faturamento total (100)
        $pA = Produto::factory()->create(['nome' => 'Top']);
        $pB = Produto::factory()->create(['nome' => 'Medio']);
        $pC = Produto::factory()->create(['nome' => 'Cauda']);

        $this->vendeItem($venda, $pA->id_produto, 8, 80.00);
        $this->vendeItem($venda, $pB->id_produto, 3, 15.00);
        $this->vendeItem($venda, $pC->id_produto, 1, 5.00);

        $r = $this->getJson('/api/v1/painel/relatorios/curva-abc?periodo_dias=30')->assertOk();

        $rows = $r->json('data');
        $this->assertSame('A', collect($rows)->firstWhere('produto', 'Top')['classe']);
        $this->assertSame('B', collect($rows)->firstWhere('produto', 'Medio')['classe']);
        $this->assertSame('C', collect($rows)->firstWhere('produto', 'Cauda')['classe']);

        $this->assertEqualsWithDelta(100.0, (float) $r->json('meta.receita_total'), 0.001);
        $this->assertSame(['A' => 1, 'B' => 1, 'C' => 1], $r->json('meta.classes'));
    }

    public function test_ignora_itens_fora_do_periodo(): void
    {
        $venda = $this->venda();
        $p = Produto::factory()->create();

        $this->vendeItem($venda, $p->id_produto, 1, 50.00, now()->subDays(120));

        $r = $this->getJson('/api/v1/painel/relatorios/curva-abc?periodo_dias=30')->assertOk();
        $this->assertCount(0, $r->json('data'));
        $this->assertEqualsWithDelta(0.0, (float) $r->json('meta.receita_total'), 0.001);
    }

    public function test_valor_padrao_de_periodo_e_90(): void
    {
        $r = $this->getJson('/api/v1/painel/relatorios/curva-abc')->assertOk();
        $this->assertSame(90, $r->json('meta.periodo_dias'));
    }
}
