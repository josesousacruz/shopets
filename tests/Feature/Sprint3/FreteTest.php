<?php

namespace Tests\Feature\Sprint3;

use App\Models\Produto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FreteTest extends TestCase
{
    use RefreshDatabase;

    public function test_stub_retorna_pac_e_sedex(): void
    {
        $produto = Produto::factory()->create(['peso_gramas' => 500]);

        $resp = $this->postJson('/api/v1/frete/cotar', [
            'cep' => '01001000',
            'itens' => [
                ['id_produto' => $produto->id_produto, 'quantidade' => 1],
            ],
        ]);

        $resp->assertOk();
        $servicos = collect($resp->json('data'))->pluck('servico')->all();
        $this->assertContains('PAC', $servicos);
        $this->assertContains('SEDEX', $servicos);
    }

    public function test_preco_cresce_com_peso(): void
    {
        $leve = Produto::factory()->create(['peso_gramas' => 200]);
        $pesado = Produto::factory()->create(['peso_gramas' => 5000]);

        $respLeve = $this->postJson('/api/v1/frete/cotar', [
            'cep' => '01001000',
            'itens' => [['id_produto' => $leve->id_produto, 'quantidade' => 1]],
        ]);
        $respPesado = $this->postJson('/api/v1/frete/cotar', [
            'cep' => '01001000',
            'itens' => [['id_produto' => $pesado->id_produto, 'quantidade' => 1]],
        ]);

        $pacLeve = collect($respLeve->json('data'))->firstWhere('servico', 'PAC')['preco'];
        $pacPesado = collect($respPesado->json('data'))->firstWhere('servico', 'PAC')['preco'];

        $this->assertGreaterThan($pacLeve, $pacPesado);
    }

    public function test_cep_invalido_retorna_422(): void
    {
        $produto = Produto::factory()->create();

        $this->postJson('/api/v1/frete/cotar', [
            'cep' => '123',
            'itens' => [['id_produto' => $produto->id_produto, 'quantidade' => 1]],
        ])->assertStatus(422);
    }
}
