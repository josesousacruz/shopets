<?php

namespace Tests\Feature\Painel;

use App\Models\Deposito;
use App\Models\EstoqueSaldo;
use App\Models\ProdutoVariacao;
use App\Services\Estoque\AlocacaoService;
use App\Services\Estoque\StockUnavailableException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AlocacaoServiceTest extends TestCase
{
    use RefreshDatabase;

    private function variacao(): ProdutoVariacao
    {
        return ProdutoVariacao::factory()->create();
    }

    private function deposito(bool $default = false, bool $ativo = true): Deposito
    {
        return Deposito::create([
            'nome' => 'Dep '.uniqid(),
            'default' => $default,
            'ativo' => $ativo,
        ]);
    }

    private function saldo(ProdutoVariacao $v, Deposito $d, int $saldo, int $reservado = 0): void
    {
        EstoqueSaldo::create([
            'produto_variacao_id' => $v->id_variacao,
            'deposito_id' => $d->id,
            'saldo' => $saldo,
            'reservado' => $reservado,
            'minimo' => 0,
            'custo_medio' => 0,
        ]);
    }

    public function test_qtd_zero_ou_negativa_retorna_array_vazio(): void
    {
        $svc = app(AlocacaoService::class);
        $v = $this->variacao();
        $this->assertSame([], $svc->alocar($v->id_variacao, 0));
        $this->assertSame([], $svc->alocar($v->id_variacao, -5));
    }

    public function test_aloca_tudo_do_default_quando_tem_saldo(): void
    {
        $v = $this->variacao();
        $d = $this->deposito(default: true);
        $this->saldo($v, $d, 10);

        $alloc = app(AlocacaoService::class)->alocar($v->id_variacao, 5);

        $this->assertCount(1, $alloc);
        $this->assertSame($d->id, $alloc[0]['deposito_id']);
        $this->assertSame(5, $alloc[0]['qtd']);
    }

    public function test_cai_para_outros_depositos_quando_default_nao_basta(): void
    {
        $v = $this->variacao();
        $def = $this->deposito(default: true);
        $other = $this->deposito();
        $this->saldo($v, $def, 3);
        $this->saldo($v, $other, 10);

        $alloc = app(AlocacaoService::class)->alocar($v->id_variacao, 8);

        $this->assertCount(2, $alloc);
        $this->assertSame($def->id, $alloc[0]['deposito_id']);
        $this->assertSame(3, $alloc[0]['qtd']);
        $this->assertSame($other->id, $alloc[1]['deposito_id']);
        $this->assertSame(5, $alloc[1]['qtd']);
    }

    public function test_lanca_quando_estoque_total_insuficiente(): void
    {
        $v = $this->variacao();
        $def = $this->deposito(default: true);
        $this->saldo($v, $def, 2);

        $this->expectException(StockUnavailableException::class);
        app(AlocacaoService::class)->alocar($v->id_variacao, 5);
    }

    public function test_respeita_reservado_no_disponivel(): void
    {
        $v = $this->variacao();
        $def = $this->deposito(default: true);
        $this->saldo($v, $def, 10, reservado: 8);

        $this->expectException(StockUnavailableException::class);
        app(AlocacaoService::class)->alocar($v->id_variacao, 5);
    }

    public function test_ignora_deposito_inativo(): void
    {
        $v = $this->variacao();
        $def = $this->deposito(default: true);
        $inativo = $this->deposito(ativo: false);
        $this->saldo($v, $def, 1);
        $this->saldo($v, $inativo, 100);

        $this->expectException(StockUnavailableException::class);
        app(AlocacaoService::class)->alocar($v->id_variacao, 5);
    }
}
