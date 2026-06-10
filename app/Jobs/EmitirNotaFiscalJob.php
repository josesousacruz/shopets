<?php

namespace App\Jobs;

use App\Models\Pedido;
use App\Models\Venda;
use App\Services\NfceService;
use App\Services\NfeService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Emissão fiscal best-effort, NÃO bloqueante, disparada após a Venda ser criada.
 *
 *  - modalidade 'retirada' -> NFC-e (NfceService::emitir).
 *  - modalidade 'entrega'  -> NF-e  (NfeService::emitir — esqueleto).
 *
 * Sucesso: grava nfe_chave/nfe_numero no pedido + evento.
 * Falha/não-configurado: move pedido para 'aguardando_revisao_fiscal' + evento + log.
 * Em nenhum caso cancela pagamento ou venda.
 */
class EmitirNotaFiscalJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $idPedido)
    {
    }

    public function handle(): void
    {
        $pedido = Pedido::withoutGlobalScopes()->find($this->idPedido);

        if (! $pedido || ! $pedido->id_venda) {
            Log::warning('EmitirNotaFiscalJob: pedido sem venda associada.', ['id_pedido' => $this->idPedido]);

            return;
        }

        // Já emitido — idempotência.
        if ($pedido->nfe_chave) {
            return;
        }

        $venda = Venda::with('itens')->find($pedido->id_venda);

        try {
            $dados = $this->montarDados($pedido, $venda);

            // Resolve o serviço sob demanda — evita construir o NfceService
            // (que lê certificado do filesystem) quando a modalidade é 'entrega'.
            $resultado = $pedido->modalidade === 'retirada'
                ? app(NfceService::class)->emitir($dados)
                : app(NfeService::class)->emitir($dados);

            $chave = $resultado['chave'] ?? ($resultado['authorizedXml'] ?? null);

            $pedido->update([
                'nfe_chave' => is_string($chave) ? substr($chave, 0, 60) : 'EMITIDA',
                'nfe_numero' => $resultado['numero'] ?? null,
            ]);

            $pedido->eventos()->create([
                'tipo' => 'nota_fiscal_emitida',
                'descricao' => 'Nota fiscal emitida ('.($pedido->modalidade === 'retirada' ? 'NFC-e' : 'NF-e').').',
                'criado_em' => now(),
            ]);
        } catch (Throwable $e) {
            Log::warning('EmitirNotaFiscalJob: emissão falhou, pedido para revisão fiscal.', [
                'id_pedido' => $pedido->id_pedido,
                'modalidade' => $pedido->modalidade,
                'erro' => $e->getMessage(),
            ]);

            $pedido->update(['status' => 'aguardando_revisao_fiscal']);

            $pedido->eventos()->create([
                'tipo' => 'revisao_fiscal',
                'descricao' => 'Emissão fiscal pendente de revisão: '.$e->getMessage(),
                'criado_em' => now(),
            ]);
        }
    }

    /**
     * @return array<string,mixed>
     */
    private function montarDados(Pedido $pedido, ?Venda $venda): array
    {
        return [
            'pedido' => $pedido->numero,
            'venda_id' => $pedido->id_venda,
            'numero_venda' => $venda?->numero_venda,
            'valor_total' => (float) ($venda?->valor_total ?? $pedido->total),
            'itens' => $venda
                ? $venda->itens->map(fn ($i) => [
                    'id_produto' => $i->id_produto,
                    'quantidade' => (float) $i->quantidade,
                    'preco_unitario' => (float) $i->preco_unitario,
                ])->all()
                : [],
        ];
    }
}
