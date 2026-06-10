<?php

namespace Tests\Feature\Sprint0;

use App\Models\Cliente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ClienteAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_cliente_can_be_created_with_credentials(): void
    {
        $cliente = Cliente::create([
            'nome'             => 'Almir',
            'email'            => 'almir@example.com',
            'password'         => 'segredo123',
            'origem'           => 'ecommerce',
            'aceita_marketing' => true,
        ]);

        $this->assertNotEmpty($cliente->password);
        $this->assertTrue(Hash::check('segredo123', $cliente->password));
        $this->assertSame('almir@example.com', $cliente->email);
    }

    public function test_email_is_unique(): void
    {
        Cliente::create(['nome' => 'A', 'email' => 'x@example.com', 'password' => 'a']);

        $this->expectException(\Illuminate\Database\QueryException::class);
        Cliente::create(['nome' => 'B', 'email' => 'x@example.com', 'password' => 'b']);
    }

    public function test_password_is_hidden_in_json(): void
    {
        $cliente = Cliente::create(['nome' => 'A', 'email' => 'y@example.com', 'password' => 'abc']);
        $array = $cliente->toArray();

        $this->assertArrayNotHasKey('password', $array);
        $this->assertArrayNotHasKey('remember_token', $array);
    }
}
