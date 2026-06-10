<?php

namespace App\Domain\Shipping;

use App\Models\Pedido;
use Illuminate\Support\Facades\DB;

/**
 * Gera a etiqueta de envio para um pedido.
 *
 * No driver stub: define um etiqueta_url placeholder e registra um PedidoEvento
 * "etiqueta gerada". Idempotente — se o pedido já tem etiqueta_url, é no-op e
 * retorna a URL existente. A integração real (Melhor Envio) será plugada depois.
 */
class GerarEtiquetaAction
{
    public function executar(Pedido $pedido): string
    {
        if (! empty($pedido->etiqueta_url)) {
            return $pedido->etiqueta_url;
        }

        return DB::transaction(function () use ($pedido) {
            $url = sprintf(
                '%s/storage/etiquetas/%s.pdf',
                rtrim((string) config('app.url'), '/'),
                $pedido->numero,
            );

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
}
