<?php

namespace App\Services\Fiscal;

use App\Models\ConfiguracaoEmpresa;
use App\Models\PontoVenda;
use Illuminate\Support\Facades\DB;

/**
 * Reserva o próximo número de NF-e/NFC-e de forma atômica (lock+increment).
 *
 * Reserva ANTES de tentar emitir e nunca reutiliza o número, mesmo se a SEFAZ
 * rejeitar depois — reemitir com o mesmo número arrisca duplicidade caso a
 * primeira tentativa tenha sido recebida pela SEFAZ antes do erro. Números
 * pulados por falha ficam "queimados" (prática padrão de emissão fiscal).
 */
class FiscalNumeracaoService
{
    /** @return array{serie:string, numero:int} */
    public function reservarNfce(int $idPdv): array
    {
        return DB::transaction(function () use ($idPdv) {
            $pdv = PontoVenda::where('id_pdv', $idPdv)->lockForUpdate()->first();
            $numero = $pdv->nfce_proximo_numero ?: 1;
            $pdv->update(['nfce_proximo_numero' => $numero + 1]);

            return ['serie' => $pdv->serie_fiscal_default ?: '1', 'numero' => $numero];
        });
    }

    /** @return array{serie:string, numero:int} */
    public function reservarNfe(): array
    {
        return DB::transaction(function () {
            $empresa = ConfiguracaoEmpresa::query()->lockForUpdate()->first();
            $numero = $empresa->nfe_proximo_numero ?: 1;
            $empresa->update(['nfe_proximo_numero' => $numero + 1]);

            return ['serie' => $empresa->nfe_serie ?: '1', 'numero' => $numero];
        });
    }
}
