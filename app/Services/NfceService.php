<?php

namespace App\Services;

use App\Models\ConfiguracaoEmpresa;
use App\Models\PontoVenda;
use App\Services\Fiscal\FiscalHelpers;
use App\Services\Fiscal\FiscalNumeracaoService;
use Exception;
use NFePHP\Common\Certificate;
use NFePHP\DA\NFe\Danfce;
use NFePHP\NFe\Common\Standardize;
use NFePHP\NFe\Complements;
use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;

/**
 * Emissão de NFC-e (modelo 65) — venda presencial (balcão do PDV físico e
 * retirada via ecommerce). CFOP fixo 5102 (NFC-e é sempre operação dentro do
 * estado do emitente); CSOSN fixo 102 (Simples Nacional) — ver FiscalHelpers.
 *
 * @see docs: única regra tributária suportada é Simples Nacional (CRT=1).
 */
class NfceService
{
    /**
     * @param  array{
     *     id_pdv:int,
     *     natOp?:string,
     *     cliente?:array{nome?:string|null,cpf?:string|null}|null,
     *     itens:array<int,array{nome:string,ncm?:string|null,unidade?:string|null,quantidade:float,preco_unitario:float,codigo?:string|null}>,
     *     pagamentos:array<int,array{tipo:string,valor:float}>,
     * }  $dados
     * @return array{chave:string, numero:int, serie:string, xml:string, authorizedXml:string, danfce_pdf:string}
     */
    public function emitir(array $dados): array
    {
        $empresa = FiscalHelpers::validarConfigEmissor(ConfiguracaoEmpresa::first());

        if (! PontoVenda::where('id_pdv', $dados['id_pdv'])->exists()) {
            throw new Exception('Ponto de venda não encontrado para emissão da NFC-e.');
        }

        ['serie' => $serie, 'numero' => $numero] = (new FiscalNumeracaoService)->reservarNfce($dados['id_pdv']);

        $tools = $this->tools($empresa);

        $make = new Make;
        $this->montarInfNFe($make);
        $this->montarIde($make, $empresa, $serie, $numero, $dados['natOp'] ?? 'Venda');
        $make->tagemit(FiscalHelpers::montarEmit($empresa));
        $make->tagenderEmit(FiscalHelpers::montarEnderEmit($empresa));
        $this->montarDest($make, $dados['cliente'] ?? null);

        $vProdTotal = 0.0;
        foreach (array_values($dados['itens']) as $i => $item) {
            $n = $i + 1;
            $vProdTotal += $this->montarItem($make, $n, $item);
        }

        $make->tagtransp((object) ['modFrete' => 9]); // 9 = sem frete (venda presencial)
        $this->montarPagamentos($make, $dados['pagamentos']);

        if (! $make->monta()) {
            throw new Exception('Erro ao montar XML NFC-e: '.implode(', ', $make->getErrors()));
        }

        $xml = $make->getXML();
        $xmlAssinado = $tools->signNFe($xml);

        $idLote = str_pad('1', 15, '0', STR_PAD_LEFT);
        $response = $tools->sefazEnviaLote([$xmlAssinado], $idLote, 1);

        $respObj = (new Standardize($response))->toStd();

        if ((int) $respObj->cStat !== 104) {
            throw new Exception("Lote não processado: {$respObj->cStat} - {$respObj->xMotivo}");
        }
        if ((int) $respObj->protNFe->infProt->cStat !== 100) {
            throw new Exception("NFC-e não autorizada: {$respObj->protNFe->infProt->cStat} - {$respObj->protNFe->infProt->xMotivo}");
        }

        $authorizedXml = Complements::toAuthorize($xmlAssinado, $response);
        $chave = (string) $respObj->protNFe->infProt->chNFe;

        $danfcePdf = (new Danfce($authorizedXml))->render();

        return [
            'chave' => $chave,
            'numero' => $numero,
            'serie' => $serie,
            'xml' => $xmlAssinado,
            'authorizedXml' => $authorizedXml,
            'danfce_pdf' => $danfcePdf,
        ];
    }

    private function tools(ConfiguracaoEmpresa $empresa): Tools
    {
        $config = json_encode([
            'atualizacao' => now()->toDateTimeString(),
            'tpAmb' => FiscalHelpers::tpAmb($empresa),
            'razaosocial' => $empresa->nome_empresa,
            'cnpj' => preg_replace('/\D/', '', (string) $empresa->cnpj),
            'siglaUF' => $empresa->endereco_uf,
            'schemes' => 'PL_009_V4',
            'versao' => '4.00',
            'tokenIBPT' => '',
            'CSC' => $empresa->csc_nfce,
            'CSCid' => $empresa->csc_id_nfce,
        ]);

        $pfx = \Illuminate\Support\Facades\Storage::disk('local')->get($empresa->certificado_path);
        $tools = new Tools($config, Certificate::readPfx($pfx, $empresa->certificado_senha));
        $tools->model('65');

        return $tools;
    }

    private function montarInfNFe(Make $make): void
    {
        $make->taginfNFe((object) ['Id' => '', 'versao' => '4.00']);
    }

    private function montarIde(Make $make, ConfiguracaoEmpresa $empresa, string $serie, int $numero, string $natOp): void
    {
        $std = new \stdClass;
        $std->cUF = FiscalHelpers::codigoUf($empresa->endereco_uf);
        $std->cNF = str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
        $std->natOp = $natOp;
        $std->mod = 65;
        $std->serie = $serie;
        $std->nNF = $numero;
        $std->dhEmi = date('c');
        $std->tpNF = 1;
        $std->idDest = 1;
        $std->cMunFG = (int) $empresa->endereco_codigo_ibge;
        $std->tpImp = 4; // DANFE NFC-e
        $std->tpEmis = 1;
        $std->cDV = 1;
        $std->tpAmb = FiscalHelpers::tpAmb($empresa);
        $std->finNFe = 1;
        $std->indFinal = 1;
        $std->indPres = 1; // presencial
        $std->procEmi = 0;
        $std->verProc = '1.0';

        $make->tagide($std);
    }

    /** Cliente anônimo (comum em NFC-e) → omite o bloco <dest> por completo. */
    private function montarDest(Make $make, ?array $cliente): void
    {
        if (empty($cliente['cpf'])) {
            return;
        }

        $make->tagdest((object) [
            'CPF' => preg_replace('/\D/', '', $cliente['cpf']),
            'xNome' => $cliente['nome'] ?? null,
            'indIEDest' => 9, // não contribuinte
        ]);
    }

    /** @return float vProd do item (pra somar no total de pagamento esperado). */
    private function montarItem(Make $make, int $n, array $item): float
    {
        $qtd = (float) $item['quantidade'];
        $vUn = (float) $item['preco_unitario'];
        $vProd = round($qtd * $vUn, 2);
        $ncm = preg_replace('/\D/', '', (string) ($item['ncm'] ?? '')) ?: '00000000';
        $unidade = mb_strtoupper((string) ($item['unidade'] ?? 'UN'));

        $make->tagprod((object) [
            'item' => $n,
            'cProd' => (string) ($item['codigo'] ?? $n),
            'cEAN' => 'SEM GTIN',
            'xProd' => mb_substr((string) $item['nome'], 0, 120),
            'NCM' => str_pad($ncm, 8, '0', STR_PAD_LEFT),
            'CFOP' => '5102', // NFC-e é sempre presencial/mesmo estado do emitente.
            'uCom' => $unidade,
            'qCom' => number_format($qtd, 4, '.', ''),
            'vUnCom' => number_format($vUn, 10, '.', ''),
            'vProd' => number_format($vProd, 2, '.', ''),
            'cEANTrib' => 'SEM GTIN',
            'uTrib' => $unidade,
            'qTrib' => number_format($qtd, 4, '.', ''),
            'vUnTrib' => number_format($vUn, 10, '.', ''),
            'indTot' => 1,
        ]);

        $make->tagimposto((object) ['item' => $n, 'vTotTrib' => 0]);
        $make->tagICMSSN((object) ['item' => $n, 'orig' => 0, 'CSOSN' => '102']);
        $make->tagPIS((object) ['item' => $n, 'CST' => '07', 'vBC' => 0, 'pPIS' => 0, 'vPIS' => 0]);
        $make->tagCOFINS((object) ['item' => $n, 'CST' => '07', 'vBC' => 0, 'pCOFINS' => 0, 'vCOFINS' => 0]);

        return $vProd;
    }

    /** @param  array<int,array{tipo:string,valor:float}>  $pagamentos */
    private function montarPagamentos(Make $make, array $pagamentos): void
    {
        $make->tagpag(new \stdClass);

        foreach ($pagamentos as $pag) {
            $make->tagdetPag((object) [
                'tPag' => FiscalHelpers::tPag($pag['tipo']),
                'vPag' => number_format((float) $pag['valor'], 2, '.', ''),
            ]);
        }
    }
}
