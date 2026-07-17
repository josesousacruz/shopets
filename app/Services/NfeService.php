<?php

namespace App\Services;

use App\Models\ConfiguracaoEmpresa;
use App\Services\Fiscal\FiscalHelpers;
use App\Services\Fiscal\FiscalNumeracaoService;
use App\Services\Fiscal\IbgeMunicipioService;
use Exception;
use Illuminate\Support\Facades\Storage;
use NFePHP\Common\Certificate;
use NFePHP\DA\NFe\Danfe;
use NFePHP\NFe\Common\Standardize;
use NFePHP\NFe\Complements;
use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use RuntimeException;
use stdClass;

/**
 * Emissão de NF-e (modelo 55) — pedidos de entrega (ecommerce). CFOP calculado
 * pela UF do destinatário (5102 mesmo estado do emitente, 6102 outro estado);
 * CSOSN fixo 102 (Simples Nacional) — mesma regra tributária única do NfceService.
 *
 * Frete: sem bloco de transportadora nomeada (CNPJ/placa) — o sistema não guarda
 * qual transportadora física entrega (abstraído pelo Melhor Envio). modFrete=9
 * (sem frete) quando não há cobrança de frete, 0 (por conta do emitente) quando há.
 *
 * ⚠️ Payload de transporte/pagamento montado conforme o schema padrão NF-e 4.00,
 * ainda não validado contra a SEFAZ real — mesma ressalva já registrada no
 * NfceService/YapayGateway. Confirmar em homologação antes do go-live.
 */
class NfeService
{
    /**
     * @param  array{
     *     natOp?:string,
     *     cliente:array{nome?:string|null,documento?:string|null,email?:string|null,telefone?:string|null},
     *     endereco:array{logradouro:string,numero?:string|null,complemento?:string|null,bairro:string,cidade:string,uf:string,cep:string}|null,
     *     itens:array<int,array{nome:string,ncm?:string|null,unidade?:string|null,quantidade:float,preco_unitario:float,codigo?:string|null}>,
     *     pagamentos:array<int,array{tipo:string,valor:float}>,
     *     frete?:float,
     * }  $dados
     * @return array{chave:string, numero:int, serie:string, xml:string, authorizedXml:string, danfe_pdf:string}
     */
    public function emitir(array $dados): array
    {
        $empresa = FiscalHelpers::validarConfigEmissor(ConfiguracaoEmpresa::first());

        if (empty($dados['endereco'])) {
            throw new RuntimeException('Pedido sem endereço de entrega — não é possível emitir NF-e.');
        }
        $endereco = $dados['endereco'];

        $codigoIbgeDest = app(IbgeMunicipioService::class)->codigo($endereco['cidade'], $endereco['uf']);
        if (! $codigoIbgeDest) {
            throw new RuntimeException("Não foi possível resolver o código IBGE de \"{$endereco['cidade']}/{$endereco['uf']}\" (consulta ao IBGE falhou ou município não encontrado).");
        }

        ['serie' => $serie, 'numero' => $numero] = (new FiscalNumeracaoService)->reservarNfe();

        $tools = $this->tools($empresa);
        $mesmoEstado = mb_strtoupper($endereco['uf']) === mb_strtoupper((string) $empresa->endereco_uf);
        $cfop = $mesmoEstado ? '5102' : '6102';

        $make = new Make;
        $this->montarInfNFe($make);
        $this->montarIde($make, $empresa, $serie, $numero, $dados['natOp'] ?? 'Venda', $mesmoEstado);
        $make->tagemit(FiscalHelpers::montarEmit($empresa));
        $make->tagenderEmit(FiscalHelpers::montarEnderEmit($empresa));
        $this->montarDest($make, $dados['cliente'], $endereco, $codigoIbgeDest);

        foreach (array_values($dados['itens']) as $i => $item) {
            $this->montarItem($make, $i + 1, $item, $cfop);
        }

        $make->tagtransp((object) ['modFrete' => (float) ($dados['frete'] ?? 0) > 0 ? '0' : '9']);
        $this->montarPagamentos($make, $dados['pagamentos']);

        if (! $make->monta()) {
            throw new Exception('Erro ao montar XML NF-e: '.implode(', ', $make->getErrors()));
        }

        $xml = $make->getXML();
        $xmlAssinado = $tools->signNFe($xml);

        $idLote = str_pad('1', 15, '0', STR_PAD_LEFT);
        $response = $tools->sefazEnviaLote([$xmlAssinado], $idLote, 1, false);

        $respObj = (new Standardize($response))->toStd();

        if ((int) $respObj->cStat !== 104) {
            throw new Exception("Lote não processado: {$respObj->cStat} - {$respObj->xMotivo}");
        }
        if ((int) $respObj->protNFe->infProt->cStat !== 100) {
            throw new Exception("NF-e não autorizada: {$respObj->protNFe->infProt->cStat} - {$respObj->protNFe->infProt->xMotivo}");
        }

        $authorizedXml = Complements::toAuthorize($xmlAssinado, $response);
        $chave = (string) $respObj->protNFe->infProt->chNFe;

        $danfePdf = (new Danfe($authorizedXml))->render();

        return [
            'chave' => $chave,
            'numero' => $numero,
            'serie' => $serie,
            'xml' => $xmlAssinado,
            'authorizedXml' => $authorizedXml,
            'danfe_pdf' => $danfePdf,
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
        ]);

        $pfx = Storage::disk('local')->get($empresa->certificado_path);
        $tools = new Tools($config, Certificate::readPfx($pfx, $empresa->certificado_senha));
        $tools->model('55');

        return $tools;
    }

    private function montarInfNFe(Make $make): void
    {
        $make->taginfNFe((object) ['Id' => '', 'versao' => '4.00']);
    }

    private function montarIde(Make $make, ConfiguracaoEmpresa $empresa, string $serie, int $numero, string $natOp, bool $mesmoEstado): void
    {
        $std = new stdClass;
        $std->cUF = FiscalHelpers::codigoUf($empresa->endereco_uf);
        $std->cNF = str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
        $std->natOp = $natOp;
        $std->mod = 55;
        $std->serie = $serie;
        $std->nNF = $numero;
        $std->dhEmi = date('c');
        $std->tpNF = 1; // saída
        $std->idDest = $mesmoEstado ? 1 : 2; // 1=mesma UF, 2=outra UF
        $std->cMunFG = (int) $empresa->endereco_codigo_ibge;
        $std->tpImp = 1; // DANFE retrato (A4)
        $std->tpEmis = 1;
        $std->cDV = 1;
        $std->tpAmb = FiscalHelpers::tpAmb($empresa);
        $std->finNFe = 1;
        $std->indFinal = 1; // consumidor final
        $std->indPres = 2; // não presencial, pela internet
        $std->procEmi = 0;
        $std->verProc = '1.0';

        $make->tagide($std);
    }

    private function montarDest(Make $make, array $cliente, array $endereco, string $codigoIbge): void
    {
        $documento = preg_replace('/\D/', '', (string) ($cliente['documento'] ?? ''));
        $ehCnpj = strlen($documento) > 11;

        $dest = (object) [
            'xNome' => $cliente['nome'] ?? 'Consumidor',
            'indIEDest' => 9, // não contribuinte — B2C, não coletamos IE do cliente
            'email' => $cliente['email'] ?? null,
        ];
        if ($ehCnpj) {
            $dest->CNPJ = $documento;
        } else {
            $dest->CPF = $documento;
        }
        $make->tagdest($dest);

        $make->tagenderDest((object) [
            'xLgr' => $endereco['logradouro'],
            'nro' => $endereco['numero'] ?: 'S/N',
            'xCpl' => $endereco['complemento'] ?? null,
            'xBairro' => $endereco['bairro'],
            'cMun' => (int) $codigoIbge,
            'xMun' => $endereco['cidade'],
            'UF' => $endereco['uf'],
            'CEP' => preg_replace('/\D/', '', (string) $endereco['cep']),
        ]);
    }

    private function montarItem(Make $make, int $n, array $item, string $cfop): void
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
            'CFOP' => $cfop,
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
    }

    /** @param  array<int,array{tipo:string,valor:float}>  $pagamentos */
    private function montarPagamentos(Make $make, array $pagamentos): void
    {
        $make->tagpag(new stdClass);

        foreach ($pagamentos as $pag) {
            $make->tagdetPag((object) [
                'tPag' => FiscalHelpers::tPag($pag['tipo']),
                'vPag' => number_format((float) $pag['valor'], 2, '.', ''),
            ]);
        }
    }
}
