<?php

namespace App\Jobs;

use App\Models\Pedido;
use App\Models\Produto;
use App\Models\Venda;
use App\Services\NfceService;
use App\Services\NfeService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Emissão fiscal best-effort, NÃO bloqueante, disparada após a Venda ser criada.
 *
 *  - modalidade 'retirada' -> NFC-e (NfceService::emitir).
 *  - modalidade 'entrega'  -> NF-e  (NfeService::emitir).
 *
 * Sucesso: grava nfe_chave/nfe_numero no pedido + evento (+ danfe_url quando o
 * gateway devolve o PDF do cupom/nota).
 * Falha/não-configurado: move pedido para 'aguardando_revisao_fiscal' + evento + log.
 * Em nenhum caso cancela pagamento ou venda.
 */
class EmitirNotaFiscalJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $idPedido) {}

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

        if (! $venda) {
            Log::warning('EmitirNotaFiscalJob: venda não encontrada.', ['id_pedido' => $this->idPedido]);

            return;
        }

        try {
            $dados = $this->montarDados($pedido, $venda);

            $resultado = $pedido->modalidade === 'retirada'
                ? app(NfceService::class)->emitir($dados)
                : app(NfeService::class)->emitir($dados);

            $pedido->update([
                'nfe_chave' => substr((string) $resultado['chave'], 0, 60),
                'nfe_numero' => (string) $resultado['numero'],
                // Reemissão manual (tela de revisão fiscal) parte de
                // aguardando_revisao_fiscal — sucesso devolve o pedido ao fluxo normal.
                'status' => $pedido->status === 'aguardando_revisao_fiscal' ? 'pago' : $pedido->status,
            ]);

            if (! empty($resultado['danfce_pdf']) || ! empty($resultado['danfe_pdf'])) {
                $this->salvarDanfe($pedido, $resultado['danfce_pdf'] ?? $resultado['danfe_pdf']);
            }

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

    private function salvarDanfe(Pedido $pedido, string $conteudoPdf): void
    {
        $caminho = "notas-fiscais/{$pedido->numero}.pdf";
        \Illuminate\Support\Facades\Storage::disk('public')->put($caminho, $conteudoPdf);
        $pedido->update(['nfe_danfe_url' => \Illuminate\Support\Facades\Storage::disk('public')->url($caminho)]);
    }

    /**
     * @return array<string,mixed>
     */
    private function montarDados(Pedido $pedido, Venda $venda): array
    {
        $comum = [
            'natOp' => 'Venda',
            'itens' => $this->itensComProduto($venda),
            'pagamentos' => $this->pagamentosDaVenda($venda),
        ];

        if ($pedido->modalidade === 'retirada') {
            return $comum + [
                'id_pdv' => $venda->id_pdv ?: $pedido->id_ponto_venda_retirada,
                'cliente' => $pedido->cliente ? [
                    'nome' => $pedido->cliente->nome,
                    'cpf' => $pedido->cliente->cpf_cnpj,
                ] : null,
            ];
        }

        $pedido->loadMissing(['cliente', 'enderecoEntrega']);
        $end = $pedido->enderecoEntrega;

        return $comum + [
            'cliente' => [
                'nome' => $pedido->cliente?->nome,
                'documento' => $pedido->cliente?->cpf_cnpj,
                'email' => $pedido->cliente?->email,
                'telefone' => $pedido->cliente?->telefone,
            ],
            'endereco' => $end ? [
                'logradouro' => $end->logradouro,
                'numero' => $end->numero,
                'complemento' => $end->complemento,
                'bairro' => $end->bairro,
                'cidade' => $end->cidade,
                'uf' => $end->uf,
                'cep' => $end->cep,
            ] : null,
        ];
    }

    /** @return array<int,array{nome:string,ncm:?string,unidade:?string,quantidade:float,preco_unitario:float,codigo:?string}> */
    private function itensComProduto(Venda $venda): array
    {
        $produtos = Produto::whereIn('id_produto', $venda->itens->pluck('id_produto')->unique())
            ->get()->keyBy('id_produto');

        return $venda->itens->map(function ($item) use ($produtos) {
            $produto = $produtos->get($item->id_produto);

            return [
                'nome' => $produto?->nome ?? 'Item',
                'ncm' => $produto?->ncm,
                'unidade' => $produto?->unidade,
                'quantidade' => (float) $item->quantidade,
                'preco_unitario' => (float) $item->preco_unitario,
                'codigo' => $produto?->codigo_interno ?? (string) $item->id_produto,
            ];
        })->values()->all();
    }

    /** @return array<int,array{tipo:string,valor:float}> */
    private function pagamentosDaVenda(Venda $venda): array
    {
        $linhas = DB::table('pagamentos_venda')
            ->join('formas_pagamento', 'formas_pagamento.id_forma_pagamento', '=', 'pagamentos_venda.id_forma_pagamento')
            ->where('pagamentos_venda.id_venda', $venda->id_venda)
            ->get(['formas_pagamento.tipo', 'pagamentos_venda.valor_pagamento']);

        if ($linhas->isEmpty()) {
            // Fallback defensivo: sem linha de pagamento vinculada, assume o
            // valor total da venda como "outros" pra não travar a emissão.
            return [['tipo' => 'outros', 'valor' => (float) $venda->valor_total]];
        }

        return $linhas->map(fn ($l) => ['tipo' => $l->tipo, 'valor' => (float) $l->valor_pagamento])->all();
    }
}
