<?php

namespace Tests\Feature\Sprint2;

use App\Mail\BoasVindasCliente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class BoasVindasTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_sends_welcome_email(): void
    {
        Mail::fake();

        $this->postJson('/api/v1/auth/register', [
            'nome' => 'Maria Silva',
            'email' => 'maria@example.com',
            'password' => 'senha12345',
            'password_confirmation' => 'senha12345',
        ])->assertStatus(201);

        Mail::assertQueued(BoasVindasCliente::class, function ($mail) {
            return $mail->hasTo('maria@example.com');
        });
    }
}
