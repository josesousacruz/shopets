<?php

namespace Tests\Feature\Sprint2;

use App\Models\Cliente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_cliente_ecommerce_and_returns_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'nome' => 'Maria Silva',
            'email' => 'maria@example.com',
            'password' => 'senha12345',
            'password_confirmation' => 'senha12345',
            'aceita_marketing' => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['cliente' => ['id', 'nome', 'email'], 'token'])
            ->assertJsonPath('cliente.email', 'maria@example.com');

        $cliente = Cliente::where('email', 'maria@example.com')->first();
        $this->assertNotNull($cliente);
        $this->assertSame('ecommerce', $cliente->origem);
        $this->assertTrue(Hash::check('senha12345', $cliente->password));
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_register_validates_unique_email(): void
    {
        Cliente::factory()->create(['email' => 'dup@example.com']);

        $response = $this->postJson('/api/v1/auth/register', [
            'nome' => 'Outro',
            'email' => 'dup@example.com',
            'password' => 'senha12345',
            'password_confirmation' => 'senha12345',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_login_valid_returns_token(): void
    {
        Cliente::factory()->create([
            'email' => 'joao@example.com',
            'password' => Hash::make('senha12345'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'joao@example.com',
            'password' => 'senha12345',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['cliente' => ['id', 'email'], 'token']);
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_login_invalid_returns_422(): void
    {
        Cliente::factory()->create([
            'email' => 'joao@example.com',
            'password' => Hash::make('senha12345'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'joao@example.com',
            'password' => 'errada',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_me_with_token_returns_cliente(): void
    {
        $cliente = Cliente::factory()->create();
        Sanctum::actingAs($cliente, ['*']);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $cliente->id_cliente)
            ->assertJsonPath('data.email', $cliente->email);
    }

    public function test_me_without_token_returns_401(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_logout_revokes_token(): void
    {
        $cliente = Cliente::factory()->create();
        $token = $cliente->createToken('storefront')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/auth/logout')
            ->assertStatus(204);

        $this->assertSame(0, \Laravel\Sanctum\PersonalAccessToken::count());

        // O guard sanctum mantém o usuário resolvido em cache durante o ciclo
        // do teste; força nova resolução para a próxima requisição.
        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }
}
