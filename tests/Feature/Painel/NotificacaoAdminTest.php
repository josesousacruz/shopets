<?php

namespace Tests\Feature\Painel;

use App\Models\Notificacao;
use App\Models\User;
use App\Services\Notificacoes\NotificacaoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificacaoAdminTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['nivel_acesso' => 'admin']);
        Sanctum::actingAs($this->user);
    }

    public function test_service_cria_notificacao(): void
    {
        $svc = app(NotificacaoService::class);
        $n = $svc->push(null, $this->user->id, 'pedido_novo', 'Pedido #123', 'mensagem', '/painel/pedidos/123', ['n' => '123']);

        $this->assertSame('pedido_novo', $n->tipo);
        $this->assertSame(['n' => '123'], $n->payload);
    }

    public function test_lista_proprias_e_globais(): void
    {
        $outro = User::factory()->create(['nivel_acesso' => 'admin']);
        Notificacao::create(['user_id' => $this->user->id, 'tipo' => 'a', 'titulo' => 'própria']);
        Notificacao::create(['user_id' => null, 'tipo' => 'b', 'titulo' => 'global']);
        Notificacao::create(['user_id' => $outro->id, 'tipo' => 'c', 'titulo' => 'outro']);

        $r = $this->getJson('/api/v1/painel/notificacoes')->assertOk();
        $this->assertSame(2, $r->json('meta.total'));
    }

    public function test_filtra_nao_lidas(): void
    {
        Notificacao::create(['user_id' => $this->user->id, 'tipo' => 'x', 'titulo' => 'pendente']);
        Notificacao::create(['user_id' => $this->user->id, 'tipo' => 'x', 'titulo' => 'lida', 'lida_em' => now()]);

        $r = $this->getJson('/api/v1/painel/notificacoes?unread=1')->assertOk();
        $this->assertSame(1, $r->json('meta.total'));
    }

    public function test_summary_traz_contagem(): void
    {
        Notificacao::create(['user_id' => $this->user->id, 'tipo' => 'x', 'titulo' => 'a']);
        Notificacao::create(['user_id' => null, 'tipo' => 'x', 'titulo' => 'b']);

        $r = $this->getJson('/api/v1/painel/notificacoes/summary')->assertOk();
        $this->assertSame(2, $r->json('data.unread_count'));
    }

    public function test_marca_lida(): void
    {
        $n = Notificacao::create(['user_id' => $this->user->id, 'tipo' => 'x', 'titulo' => 'a']);

        $this->postJson("/api/v1/painel/notificacoes/{$n->id}/marcar-lida")->assertOk();
        $this->assertNotNull($n->refresh()->lida_em);
    }

    public function test_marca_todas_lidas(): void
    {
        Notificacao::create(['user_id' => $this->user->id, 'tipo' => 'x', 'titulo' => 'a']);
        Notificacao::create(['user_id' => null, 'tipo' => 'x', 'titulo' => 'b']);

        $this->postJson('/api/v1/painel/notificacoes/marcar-todas-lidas')->assertOk();
        $this->assertSame(0, Notificacao::whereNull('lida_em')->count());
    }
}
