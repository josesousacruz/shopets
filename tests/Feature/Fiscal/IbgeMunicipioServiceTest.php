<?php

namespace Tests\Feature\Fiscal;

use App\Services\Fiscal\IbgeMunicipioService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IbgeMunicipioServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    private function fakeMunicipios(): void
    {
        Http::fake([
            'servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios' => Http::response([
                ['id' => 3550308, 'nome' => 'São Paulo'],
                ['id' => 3509502, 'nome' => 'Campinas'],
            ]),
        ]);
    }

    public function test_resolve_codigo_ignorando_acento_e_caixa(): void
    {
        $this->fakeMunicipios();

        $this->assertSame('3550308', (new IbgeMunicipioService)->codigo('sao paulo', 'SP'));
        $this->assertSame('3550308', (new IbgeMunicipioService)->codigo('SÃO PAULO', 'sp'));
    }

    public function test_municipio_nao_encontrado_retorna_null(): void
    {
        $this->fakeMunicipios();

        $this->assertNull((new IbgeMunicipioService)->codigo('Cidade Inexistente', 'SP'));
    }

    public function test_falha_de_rede_retorna_null_sem_lancar(): void
    {
        Http::fake(['servicodados.ibge.gov.br/*' => Http::response('', 500)]);

        $this->assertNull((new IbgeMunicipioService)->codigo('São Paulo', 'SP'));
    }

    public function test_resultado_fica_em_cache_evitando_segunda_chamada(): void
    {
        $this->fakeMunicipios();
        $service = new IbgeMunicipioService;

        $service->codigo('Campinas', 'SP');
        $service->codigo('Campinas', 'SP');

        Http::assertSentCount(1);
    }
}
