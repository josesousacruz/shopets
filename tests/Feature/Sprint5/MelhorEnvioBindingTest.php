<?php

namespace Tests\Feature\Sprint5;

use App\Domain\Shipping\MelhorEnvioService;
use App\Domain\Shipping\ShippingQuoteInterface;
use App\Domain\Shipping\StubShippingService;
use App\Models\ConfiguracaoEmpresa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MelhorEnvioBindingTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_padrao_e_stub(): void
    {
        $this->assertInstanceOf(StubShippingService::class, app(ShippingQuoteInterface::class));
    }

    public function test_driver_melhorenvio_resolve_melhor_envio_service(): void
    {
        // Driver agora vem de configuracoes_empresa (tela do painel), não do .env.
        ConfiguracaoEmpresa::create(['nome_empresa' => 'Loja', 'shipping_driver' => 'melhorenvio']);
        config()->set('services.shipping.melhorenvio.token', 'fake-token');

        $this->assertInstanceOf(MelhorEnvioService::class, app()->make(ShippingQuoteInterface::class));
    }

    public function test_sem_token_lanca_runtime_exception(): void
    {
        $service = new MelhorEnvioService(null);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('configure MELHORENVIO_TOKEN');

        $service->cotar('01001000', collect([['quantidade' => 1]]));
    }
}
