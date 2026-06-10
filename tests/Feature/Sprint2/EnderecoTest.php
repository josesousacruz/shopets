<?php

namespace Tests\Feature\Sprint2;

use App\Models\Cliente;
use App\Models\EnderecoCliente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EnderecoTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'apelido' => 'Casa',
            'cep' => '40010000',
            'logradouro' => 'Rua A',
            'numero' => '100',
            'bairro' => 'Centro',
            'cidade' => 'Salvador',
            'uf' => 'BA',
            'tipo' => 'entrega',
        ], $overrides);
    }

    public function test_first_endereco_becomes_principal(): void
    {
        $cliente = Cliente::factory()->create();
        Sanctum::actingAs($cliente, ['*']);

        $response = $this->postJson('/api/v1/enderecos', $this->payload());

        $response->assertStatus(201)->assertJsonPath('data.principal', true);
    }

    public function test_lists_only_own_enderecos(): void
    {
        $cliente = Cliente::factory()->create();
        $outro = Cliente::factory()->create();
        EnderecoCliente::factory()->count(2)->create(['id_cliente' => $cliente->id_cliente]);
        EnderecoCliente::factory()->create(['id_cliente' => $outro->id_cliente]);

        Sanctum::actingAs($cliente, ['*']);

        $response = $this->getJson('/api/v1/enderecos');
        $response->assertStatus(200)->assertJsonCount(2, 'data');
    }

    public function test_cannot_update_another_clientes_endereco(): void
    {
        $cliente = Cliente::factory()->create();
        $outro = Cliente::factory()->create();
        $endereco = EnderecoCliente::factory()->create(['id_cliente' => $outro->id_cliente]);

        Sanctum::actingAs($cliente, ['*']);

        $this->putJson('/api/v1/enderecos/'.$endereco->id_endereco, $this->payload())
            ->assertStatus(404);
    }

    public function test_cannot_delete_another_clientes_endereco(): void
    {
        $cliente = Cliente::factory()->create();
        $outro = Cliente::factory()->create();
        $endereco = EnderecoCliente::factory()->create(['id_cliente' => $outro->id_cliente]);

        Sanctum::actingAs($cliente, ['*']);

        $this->deleteJson('/api/v1/enderecos/'.$endereco->id_endereco)
            ->assertStatus(404);
    }

    public function test_setting_principal_unsets_others(): void
    {
        $cliente = Cliente::factory()->create();
        $antigo = EnderecoCliente::factory()->create([
            'id_cliente' => $cliente->id_cliente,
            'principal' => true,
        ]);

        Sanctum::actingAs($cliente, ['*']);

        $this->postJson('/api/v1/enderecos', $this->payload(['principal' => true]))
            ->assertStatus(201)
            ->assertJsonPath('data.principal', true);

        $this->assertFalse($antigo->fresh()->principal);
        $this->assertSame(1, EnderecoCliente::where('id_cliente', $cliente->id_cliente)
            ->where('principal', true)->count());
    }
}
