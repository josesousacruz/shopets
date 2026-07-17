<?php

namespace App\Domain\Shipping;

use App\Models\ConfiguracaoEmpresa;
use App\Models\Pedido;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Gera a etiqueta de envio de um pedido. Idempotente — se o pedido já tem
 * etiqueta_url, é no-op e retorna a URL existente.
 *
 * Tenta a compra real no Melhor Envio primeiro (quando o driver de frete é
 * `melhorenvio` e o pedido tem `frete_servico_id`); se não for elegível ou a
 * compra falhar (conta sem saldo, serviço indisponível etc.), cai pro PDF
 * interno — best-effort, igual ao padrão já usado na emissão fiscal
 * (EmitirNotaFiscalJob): nunca bloqueia a operação do pedido por causa disso.
 */
class GerarEtiquetaAction
{
    public function __construct(private readonly ShippingQuoteInterface $shipping) {}

    public function executar(Pedido $pedido): string
    {
        if (! empty($pedido->etiqueta_url)) {
            return $pedido->etiqueta_url;
        }

        $urlReal = $this->tentarComprarReal($pedido);
        if ($urlReal) {
            return $this->salvar($pedido, $urlReal, 'Etiqueta comprada no Melhor Envio.');
        }

        return DB::transaction(function () use ($pedido) {
            $pedido->loadMissing(['cliente', 'enderecoEntrega', 'itens']);
            $empresa = ConfiguracaoEmpresa::first();

            $pdf = Pdf::loadHTML($this->html($pedido, $empresa))->setPaper('a6', 'landscape');

            $caminho = "etiquetas/{$pedido->numero}.pdf";
            Storage::disk('public')->put($caminho, $pdf->output());

            $url = Storage::disk('public')->url($caminho);

            return $this->salvar($pedido, $url, 'Etiqueta de envio gerada (PDF interno).');
        });
    }

    private function tentarComprarReal(Pedido $pedido): ?string
    {
        if (! $this->shipping instanceof MelhorEnvioService || empty($pedido->frete_servico_id)) {
            return null;
        }

        try {
            return (new ComprarEtiquetaMelhorEnvioAction($this->shipping))->executar($pedido);
        } catch (Throwable $e) {
            Log::warning('GerarEtiquetaAction: compra real no Melhor Envio falhou, caindo pro PDF interno.', [
                'id_pedido' => $pedido->id_pedido,
                'erro' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function salvar(Pedido $pedido, string $url, string $descricaoEvento): string
    {
        $pedido->etiqueta_url = $url;
        $pedido->save();

        $pedido->eventos()->create([
            'tipo' => 'etiqueta_gerada',
            'descricao' => $descricaoEvento,
            'criado_em' => now(),
        ]);

        return $url;
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
