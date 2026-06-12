<?php

namespace Tests\Feature\Painel;

use App\Models\Cliente;
use App\Models\ClienteTag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClienteAdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->admin);
    }

    public function test_lista_clientes(): void
    {
        Cliente::factory()->count(3)->create();
        $r = $this->getJson('/api/v1/painel/clientes')->assertOk();
        $this->assertSame(3, $r->json('meta.total'));
    }

    public function test_filtra_por_q(): void
    {
        Cliente::factory()->create(['nome' => 'Joao Silva']);
        Cliente::factory()->create(['nome' => 'Maria']);
        $r = $this->getJson('/api/v1/painel/clientes?q=joao')->assertOk();
        $this->assertSame(1, $r->json('meta.total'));
    }

    public function test_filtra_por_tag(): void
    {
        $cli = Cliente::factory()->create();
        $tag = ClienteTag::create(['nome' => 'VIP', 'cor' => '#0F766E']);
        $cli->tags()->attach($tag->id);

        $r = $this->getJson("/api/v1/painel/clientes?tag_id={$tag->id}")->assertOk();
        $this->assertSame(1, $r->json('meta.total'));
    }

    public function test_cria_cliente_envia_email(): void
    {
        Mail::fake();
        $this->postJson('/api/v1/painel/clientes', [
            'nome' => 'Novo Cliente',
            'email' => 'novo@cli.com',
            'enviar_email' => true,
        ])->assertCreated();

        $this->assertTrue(Cliente::where('email', 'novo@cli.com')->exists());
        Mail::assertQueued(\App\Mail\ClienteCriadoSenha::class);
    }

    public function test_show_com_metricas_e_tags(): void
    {
        $cli = Cliente::factory()->create();
        $tag = ClienteTag::create(['nome' => 'Top', 'cor' => '#0F766E']);
        $cli->tags()->attach($tag->id);

        $r = $this->getJson("/api/v1/painel/clientes/{$cli->id_cliente}")->assertOk();
        $this->assertArrayHasKey('metricas', $r->json('data'));
        $this->assertCount(1, $r->json('data.cliente.tags'));
    }

    public function test_adiciona_nota(): void
    {
        $cli = Cliente::factory()->create();
        $this->postJson("/api/v1/painel/clientes/{$cli->id_cliente}/notas", [
            'texto' => 'Cliente bom pagador',
        ])->assertCreated();
        $this->assertSame(1, $cli->notas()->count());
    }

    public function test_sync_tags(): void
    {
        $cli = Cliente::factory()->create();
        $t1 = ClienteTag::create(['nome' => 'A', 'cor' => '#000']);
        $t2 = ClienteTag::create(['nome' => 'B', 'cor' => '#fff']);

        $this->postJson("/api/v1/painel/clientes/{$cli->id_cliente}/tags", [
            'tag_ids' => [$t1->id, $t2->id],
        ])->assertOk();
        $this->assertSame(2, $cli->tags()->count());
    }

    public function test_export_csv(): void
    {
        Cliente::factory()->count(2)->create();
        $r = $this->get('/api/v1/painel/clientes-export')->assertOk();
        $r->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('Nome,Email', $r->getContent());
    }

    public function test_toggle_status(): void
    {
        $cli = Cliente::factory()->create(['ativo' => true]);
        $this->postJson("/api/v1/painel/clientes/{$cli->id_cliente}/toggle")->assertOk();
        $this->assertFalse($cli->refresh()->ativo);
    }

    public function test_cria_segmento_e_lista(): void
    {
        $this->postJson('/api/v1/painel/segmentos-clientes', [
            'nome' => 'VIPs',
            'filtros' => ['status' => 'ativo', 'tag_id' => 1],
        ])->assertCreated();

        $r = $this->getJson('/api/v1/painel/segmentos-clientes')->assertOk();
        $this->assertCount(1, $r->json('data'));
    }
}
