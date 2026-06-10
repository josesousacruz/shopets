<?php

namespace Tests\Feature\Sprint4;

use App\Models\PontoVenda;
use App\Models\User;
use Database\Seeders\EcommerceInfraSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EcommerceInfraTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_cria_usuario_sistema_e_pdv(): void
    {
        $this->seed(EcommerceInfraSeeder::class);

        $this->assertDatabaseHas('users', [
            'email' => config('ecommerce.system_user_email'),
            'nivel_acesso' => 'admin',
            'ativo' => true,
        ]);
        $this->assertDatabaseHas('pontos_venda', [
            'nome_pdv' => config('ecommerce.pdv_nome'),
        ]);

        // Closures de config resolvem os ids.
        $userId = config('ecommerce.system_user_id')();
        $pdvId = config('ecommerce.pdv_id')();
        $this->assertNotNull($userId);
        $this->assertNotNull($pdvId);
    }

    public function test_seeder_e_idempotente(): void
    {
        $this->seed(EcommerceInfraSeeder::class);
        $this->seed(EcommerceInfraSeeder::class);

        $this->assertEquals(1, User::where('email', config('ecommerce.system_user_email'))->count());
        $this->assertEquals(1, PontoVenda::where('nome_pdv', config('ecommerce.pdv_nome'))->count());
    }
}
