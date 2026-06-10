<?php

namespace App\Services;

use RuntimeException;

/**
 * Esqueleto de emissão de NF-e (modelo 55) para pedidos com modalidade 'entrega'.
 *
 * A emissão real de NF-e depende de certificado digital A1, inscrição estadual,
 * homologação na SEFAZ e dados completos de destinatário/transporte. Por ora o
 * serviço lança para sinalizar "não configurado" — o EmitirNotaFiscalJob trata
 * isso como best-effort e move o pedido para 'aguardando_revisao_fiscal' sem
 * bloquear pagamento/venda.
 *
 * @see docs followup: NF-e (cert A1 + homologação).
 */
class NfeService
{
    /**
     * @param  array<string,mixed>  $dados
     * @return array{chave:string, numero:string, xml?:string}
     */
    public function emitir(array $dados): array
    {
        throw new RuntimeException('Emissão de NF-e (entrega) ainda não configurada. Requer certificado A1 + homologação SEFAZ.');
    }
}
