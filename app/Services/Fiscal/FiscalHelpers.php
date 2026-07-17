<?php

namespace App\Services\Fiscal;

use App\Models\ConfiguracaoEmpresa;
use RuntimeException;
use stdClass;

/**
 * Helpers compartilhados entre NfceService e NfeService: código IBGE de UF,
 * bloco emitente, mapeamento de forma de pagamento → tPag (SEFAZ).
 */
class FiscalHelpers
{
    /** Código IBGE de cada UF (2 dígitos) — tabela fixa, não muda. */
    private const CODIGO_UF = [
        'RO' => 11, 'AC' => 12, 'AM' => 13, 'RR' => 14, 'PA' => 15, 'AP' => 16, 'TO' => 17,
        'MA' => 21, 'PI' => 22, 'CE' => 23, 'RN' => 24, 'PB' => 25, 'PE' => 26, 'AL' => 27, 'SE' => 28, 'BA' => 29,
        'MG' => 31, 'ES' => 32, 'RJ' => 33, 'SP' => 35,
        'PR' => 41, 'SC' => 42, 'RS' => 43,
        'MS' => 50, 'MT' => 51, 'GO' => 52, 'DF' => 53,
    ];

    /**
     * Forma de pagamento (enum interno) → tPag do SEFAZ.
     *
     * @see https://www.nfe.fazenda.gov.br (Manual de Orientação do Contribuinte — grupo YA)
     */
    private const TPAG = [
        'dinheiro' => '01',
        'cheque' => '02',
        'cartao_credito' => '03',
        'cartao_debito' => '04',
        'pix' => '17',
        'transferencia' => '18',
        'boleto' => '15',
        'crediario' => '99',
        'outros' => '99',
    ];

    public static function codigoUf(string $uf): int
    {
        $uf = mb_strtoupper(trim($uf));

        return self::CODIGO_UF[$uf] ?? throw new RuntimeException("UF '{$uf}' desconhecida.");
    }

    public static function tPag(string $tipo): string
    {
        return self::TPAG[$tipo] ?? '99';
    }

    /**
     * Garante que a config fiscal mínima existe antes de tentar emitir — falha
     * cedo e com mensagem clara em vez de deixar o Make() acusar erro genérico.
     */
    public static function validarConfigEmissor(?ConfiguracaoEmpresa $empresa): ConfiguracaoEmpresa
    {
        if (! $empresa
            || empty($empresa->cnpj)
            || empty($empresa->endereco_cep)
            || empty($empresa->endereco_codigo_ibge)
            || empty($empresa->certificado_path)
            || empty($empresa->certificado_senha)
        ) {
            throw new RuntimeException(
                'Configuração fiscal incompleta (CNPJ, endereço estruturado, código IBGE ou certificado). '
                .'Preencha em Configurações → Loja / Fiscal.'
            );
        }

        if (($empresa->regime_tributario ?: '1') !== '1') {
            // CSOSN (Simples Nacional) é a única regra de tributação suportada hoje —
            // ver decisão registrada na sessão que implementou isso.
            throw new RuntimeException(
                'Regime tributário "'.$empresa->regime_tributario.'" ainda não suportado (só Simples Nacional/CSOSN).'
            );
        }

        return $empresa;
    }

    public static function tpAmb(ConfiguracaoEmpresa $empresa): int
    {
        return (int) ($empresa->ambiente_nfce ?: 2);
    }

    public static function montarEmit(ConfiguracaoEmpresa $empresa): stdClass
    {
        $std = new stdClass;
        $std->xNome = $empresa->nome_empresa;
        $std->CNPJ = preg_replace('/\D/', '', (string) $empresa->cnpj);
        $std->IE = preg_replace('/\D/', '', (string) $empresa->inscricao_estadual);
        $std->CRT = (int) ($empresa->regime_tributario ?: '1');

        return $std;
    }

    public static function montarEnderEmit(ConfiguracaoEmpresa $empresa): stdClass
    {
        $std = new stdClass;
        $std->xLgr = $empresa->endereco_logradouro;
        $std->nro = $empresa->endereco_numero ?: 'S/N';
        $std->xCpl = $empresa->endereco_complemento;
        $std->xBairro = $empresa->endereco_bairro;
        $std->cMun = (int) $empresa->endereco_codigo_ibge;
        $std->xMun = $empresa->endereco_cidade;
        $std->UF = $empresa->endereco_uf;
        $std->CEP = preg_replace('/\D/', '', (string) $empresa->endereco_cep);

        return $std;
    }
}
