<?php

namespace Tests\Feature\Sprint2;

use App\Models\Cliente;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_forgot_sends_reset_notification(): void
    {
        Notification::fake();
        $cliente = Cliente::factory()->create(['email' => 'reset@example.com']);

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'reset@example.com',
        ])->assertStatus(200);

        Notification::assertSentTo($cliente, ResetPassword::class);
    }

    public function test_forgot_unknown_email_still_200(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'naoexiste@example.com',
        ])->assertStatus(200);

        Notification::assertNothingSent();
    }

    public function test_reset_with_valid_token_changes_password(): void
    {
        $cliente = Cliente::factory()->create([
            'email' => 'reset@example.com',
            'password' => Hash::make('senhaantiga'),
        ]);

        $token = Password::broker('clientes')->createToken($cliente);

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token,
            'email' => 'reset@example.com',
            'password' => 'novasenha123',
            'password_confirmation' => 'novasenha123',
        ])->assertStatus(200);

        $cliente->refresh();
        $this->assertTrue(Hash::check('novasenha123', $cliente->password));
    }

    public function test_reset_with_invalid_token_returns_422(): void
    {
        Cliente::factory()->create([
            'email' => 'reset@example.com',
            'password' => Hash::make('senhaantiga'),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => 'token-invalido',
            'email' => 'reset@example.com',
            'password' => 'novasenha123',
            'password_confirmation' => 'novasenha123',
        ])->assertStatus(422);
    }
}
