<?php

namespace Tests\Feature\Sprint2;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CepTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_normalized_address(): void
    {
        Http::fake([
            'viacep.com.br/*' => Http::response([
                'cep' => '40010-000',
                'logradouro' => 'Avenida Estados Unidos',
                'bairro' => 'Comércio',
                'localidade' => 'Salvador',
                'uf' => 'BA',
            ], 200),
        ]);

        $response = $this->getJson('/api/v1/cep/40010000');

        $response->assertStatus(200)
            ->assertJson([
                'cep' => '40010-000',
                'logradouro' => 'Avenida Estados Unidos',
                'bairro' => 'Comércio',
                'cidade' => 'Salvador',
                'uf' => 'BA',
            ]);
    }

    public function test_invalid_cep_returns_404(): void
    {
        Http::fake([
            'viacep.com.br/*' => Http::response(['erro' => true], 200),
        ]);

        $this->getJson('/api/v1/cep/00000000')->assertStatus(404);
    }
}
