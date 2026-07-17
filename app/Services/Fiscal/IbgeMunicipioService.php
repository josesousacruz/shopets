<?php

namespace App\Services\Fiscal;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Resolve o código IBGE (7 dígitos) de um município a partir do nome + UF,
 * consultando a API pública do IBGE. Usado pela NF-e (cMunFG/cMunDest) —
 * a NFC-e não precisa disso (CFOP fixo, ver NfceService).
 *
 * Best-effort: falha de rede/município não encontrado retorna null, e quem
 * chama decide o que fazer (mesmo espírito não-bloqueante do EmitirNotaFiscalJob).
 * Cache "forever" — códigos de município praticamente nunca mudam.
 */
class IbgeMunicipioService
{
    private const BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

    public function codigo(string $municipio, string $uf): ?string
    {
        $uf = mb_strtoupper(trim($uf));
        $chave = 'ibge_municipio:'.$uf.':'.$this->normalizar($municipio);

        return Cache::rememberForever($chave, function () use ($municipio, $uf) {
            return $this->consultar($municipio, $uf);
        });
    }

    private function consultar(string $municipio, string $uf): ?string
    {
        try {
            $resposta = Http::timeout(8)
                ->get(self::BASE_URL."/estados/{$uf}/municipios")
                ->throw()
                ->json();
        } catch (\Throwable $e) {
            Log::warning('IbgeMunicipioService: falha ao consultar API do IBGE.', [
                'uf' => $uf,
                'municipio' => $municipio,
                'erro' => $e->getMessage(),
            ]);

            return null;
        }

        $alvo = $this->normalizar($municipio);

        foreach ((array) $resposta as $item) {
            if ($this->normalizar((string) ($item['nome'] ?? '')) === $alvo) {
                return (string) ($item['id'] ?? '') ?: null;
            }
        }

        Log::warning('IbgeMunicipioService: município não encontrado na lista do IBGE.', [
            'uf' => $uf,
            'municipio' => $municipio,
        ]);

        return null;
    }

    /** Minúsculo, sem acento, sem espaços duplicados — pra casar "São Paulo" com "sao paulo". */
    private function normalizar(string $texto): string
    {
        $semAcento = Str::ascii($texto);

        return trim(mb_strtolower(preg_replace('/\s+/', ' ', $semAcento)));
    }
}
