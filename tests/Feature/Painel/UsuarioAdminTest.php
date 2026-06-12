<?php

namespace Tests\Feature\Painel;

use App\Models\User;
use Database\Seeders\PainelPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class UsuarioAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PainelPermissionsSeeder::class);
        Sanctum::actingAs(User::factory()->create([
            'nivel_acesso' => 'admin',
            'name' => 'Root',
            'email' => 'root@test.com',
        ]));
    }

    public function test_lista_usuarios_paginada(): void
    {
        User::factory()->count(3)->create(['nivel_acesso' => 'admin']);

        $r = $this->getJson('/api/v1/painel/usuarios')->assertOk();

        $this->assertSame(4, $r->json('meta.total')); // 3 + setUp
    }

    public function test_filtra_por_q(): void
    {
        User::factory()->create(['name' => 'Joao Silva', 'nivel_acesso' => 'admin']);
        User::factory()->create(['name' => 'Maria', 'nivel_acesso' => 'admin']);

        $r = $this->getJson('/api/v1/painel/usuarios?q=joao')->assertOk();

        $this->assertSame(1, $r->json('meta.total'));
        $this->assertSame('Joao Silva', $r->json('data.0.name'));
    }

    public function test_cria_usuario_gera_senha_e_envia_email(): void
    {
        Mail::fake();
        Role::create(['name' => 'Gerente', 'guard_name' => 'web']);

        $r = $this->postJson('/api/v1/painel/usuarios', [
            'name' => 'Novo',
            'email' => 'novo@test.com',
            'cpf' => '12345678900',
            'papeis' => ['Gerente'],
        ])->assertCreated();

        $u = User::where('email', 'novo@test.com')->first();
        $this->assertNotNull($u);
        $this->assertSame('admin', $u->nivel_acesso);
        $this->assertTrue($u->ativo);
        $this->assertTrue($u->hasRole('Gerente'));

        Mail::assertQueued(\App\Mail\UsuarioPainelCriado::class, function ($mail) use ($u) {
            return $mail->user->id === $u->id;
        });
    }

    public function test_atualiza_dados_e_papeis(): void
    {
        $u = User::factory()->create(['nivel_acesso' => 'admin']);
        Role::create(['name' => 'Caixa', 'guard_name' => 'web']);

        $this->putJson("/api/v1/painel/usuarios/{$u->id}", [
            'name' => 'Editado',
            'email' => $u->email,
            'papeis' => ['Caixa'],
        ])->assertOk();

        $u->refresh();
        $this->assertSame('Editado', $u->name);
        $this->assertTrue($u->hasRole('Caixa'));
    }

    public function test_toggle_status(): void
    {
        $u = User::factory()->create(['nivel_acesso' => 'admin', 'ativo' => true]);

        $this->postJson("/api/v1/painel/usuarios/{$u->id}/toggle")->assertOk();
        $this->assertFalse($u->refresh()->ativo);

        $this->postJson("/api/v1/painel/usuarios/{$u->id}/toggle")->assertOk();
        $this->assertTrue($u->refresh()->ativo);
    }

    public function test_exclui_usuario(): void
    {
        $u = User::factory()->create(['nivel_acesso' => 'admin']);

        $this->deleteJson("/api/v1/painel/usuarios/{$u->id}")->assertNoContent();
        $this->assertNull(User::find($u->id));
    }

    public function test_nao_permite_se_auto_excluir(): void
    {
        $self = auth()->user();
        $this->deleteJson("/api/v1/painel/usuarios/{$self->id}")->assertStatus(422);
    }

    public function test_valida_email_unico(): void
    {
        User::factory()->create(['email' => 'taken@test.com']);
        $this->postJson('/api/v1/painel/usuarios', [
            'name' => 'X',
            'email' => 'taken@test.com',
            'cpf' => '99988877766',
            'papeis' => [],
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }
}
