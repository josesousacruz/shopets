<?php

namespace App\Domain\Shipping;

use App\Models\ConfiguracaoEmpresa;
use App\Models\Pedido;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Gera a etiqueta de envio (PDF) para um pedido e a armazena no disco público.
 *
 * Idempotente — se o pedido já tem etiqueta_url, é no-op e retorna a URL
 * existente. A integração real (Melhor Envio) substitui este gerador depois.
 */
class GerarEtiquetaAction
{
    public function executar(Pedido $pedido): string
    {
        if (! empty($pedido->etiqueta_url)) {
            return $pedido->etiqueta_url;
        }

        return DB::transaction(function () use ($pedido) {
            $pedido->loadMissing(['cliente', 'enderecoEntrega', 'itens']);
            $empresa = ConfiguracaoEmpresa::first();

            $pdf = Pdf::loadHTML($this->html($pedido, $empresa))->setPaper('a6', 'landscape');

            $caminho = "etiquetas/{$pedido->numero}.pdf";
            Storage::disk('public')->put($caminho, $pdf->output());

            $url = Storage::disk('public')->url($caminho);

            $pedido->etiqueta_url = $url;
            $pedido->save();

            $pedido->eventos()->create([
                'tipo' => 'etiqueta_gerada',
                'descricao' => 'Etiqueta de envio gerada.',
                'criado_em' => now(),
            ]);

            return $url;
        });
    }

    private function html(Pedido $pedido, ?ConfiguracaoEmpresa $empresa): string
    {
        $end = $pedido->enderecoEntrega;
        $destino = $end
            ? e($end->logradouro).', '.e($end->numero ?? 's/n')
                .($end->complemento ? ' — '.e($end->complemento) : '').'<br>'
                .e($end->bairro).' · '.e($end->cidade).'/'.e($end->uf).'<br>CEP '.e($end->cep)
            : 'Retirada na loja';

        $remetente = $empresa
            ? e($empresa->nome_empresa).'<br>'.e($empresa->endereco ?? '')
            : 'Loja';

        $nome = e($pedido->cliente?->nome ?? 'Cliente');
        $rastreio = $pedido->codigo_rastreio
            ? '<div style="margin-top:4px">Rastreio: '.e($pedido->codigo_rastreio).'</div>'
            : '';
        $qtdItens = (int) $pedido->itens->sum('quantidade');

        return <<<HTML
<html><body style="font-family:sans-serif;font-size:11px;margin:0;padding:10px">
  <div style="border:2px solid #000;padding:10px">
    <div style="font-size:9px;color:#555">REMETENTE</div>
    <div>{$remetente}</div>
    <hr style="border:none;border-top:1px dashed #999;margin:8px 0">
    <div style="font-size:9px;color:#555">DESTINATÁRIO</div>
    <div style="font-size:14px;font-weight:bold">{$nome}</div>
    <div>{$destino}</div>
    <hr style="border:none;border-top:1px solid #000;margin:8px 0">
    <div><strong>Pedido {$pedido->numero}</strong> — {$qtdItens} item(ns)</div>
    {$rastreio}
  </div>
</body></html>
HTML;
    }
}
