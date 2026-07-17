<?php

namespace Tests\Feature\Fiscal;

use App\Models\ConfiguracaoEmpresa;
use App\Models\PontoVenda;
use App\Services\Fiscal\FiscalNumeracaoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FiscalNumeracaoServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_reservar_nfce_incrementa_e_nunca_reutiliza(): void
    {
        $pdv = PontoVenda::create(['nome_pdv' => 'Loja 1', 'serie_fiscal_default' => '2']);
        $service = new FiscalNumeracaoService;

        $r1 = $service->reservarNfce($pdv->id_pdv);
        $r2 = $service->reservarNfce($pdv->id_pdv);

        $this->assertSame(['serie' => '2', 'numero' => 1], $r1);
        $this->assertSame(['serie' => '2', 'numero' => 2], $r2);
        $this->assertSame(3, PontoVenda::find($pdv->id_pdv)->nfce_proximo_numero);
    }

    public function test_reservar_nfce_serie_default_quando_pdv_sem_serie(): void
    {
        $pdv = PontoVenda::create(['nome_pdv' => 'Loja 2']);

        $r = (new FiscalNumeracaoService)->reservarNfce($pdv->id_pdv);

        $this->assertSame('1', $r['serie']);
        $this->assertSame(1, $r['numero']);
    }

    public function test_reservar_nfce_e_independente_por_pdv(): void
    {
        $pdv1 = PontoVenda::create(['nome_pdv' => 'Loja 1']);
        $pdv2 = PontoVenda::create(['nome_pdv' => 'Loja 2']);
        $service = new FiscalNumeracaoService;

        $service->reservarNfce($pdv1->id_pdv);
        $service->reservarNfce($pdv1->id_pdv);
        $r2 = $service->reservarNfce($pdv2->id_pdv);

        $this->assertSame(1, $r2['numero']);
    }

    public function test_reservar_nfe_incrementa_e_nunca_reutiliza(): void
    {
        ConfiguracaoEmpresa::create(['nome_empresa' => 'Loja', 'nfe_serie' => '3']);
        $service = new FiscalNumeracaoService;

        $r1 = $service->reservarNfe();
        $r2 = $service->reservarNfe();

        $this->assertSame(['serie' => '3', 'numero' => 1], $r1);
        $this->assertSame(['serie' => '3', 'numero' => 2], $r2);
    }
}
