<?php

namespace App\Services;

use NFePHP\NFe\Tools;
use NFePHP\NFe\Make;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Common\Standardize;
use NFePHP\NFe\Complements;
use Exception;

class NfceService
{
    protected Tools $tools;
    protected string $configJson;

    public function __construct()
    {
        // Carregar as configurações
        $arr = [
            "atualizacao" => "2017-02-20 09:11:21",
            "tpAmb" => 2, //Homologação
            "razaosocial" => "Intermaritima Portos e Logistica",
            "cnpj" => "96825575001194",
            "siglaUF" => "BA",
            "schemes" => "PL_009_V4",
            "versao" => '4.00',
            "tokenIBPT" => "AAAAAAA",
            "CSC" => "GPB0JBWLUR6HWFTVEAS6RJ69GPCROFPBBB8G",
            "CSCid" => "000001",
            "proxyConf" => [
                "proxyIp" => "",
                "proxyPort" => "",
                "proxyUser" => "",
                "proxyPass" => ""
            ]
        ];

        $this->configJson = json_encode($arr);

        // Certificado (pegar do diretório correto)
        $pfx = file_get_contents(storage_path('app/certificados/96825575002328_COMPAT.pfx'));

        // Inicializa a ferramenta
        $this->tools = new Tools($this->configJson, Certificate::readPfx($pfx, '25742574'));

        // Desabilita a validação do certificado, se necessário
        // $this->tools->disableCertValidation(true);  // Se necessário, descomente esta linha

        // Configura o modelo de NFC-e
        $this->tools->model('65');  // Configura o modelo de NFC-e
    }

    /**
     * Função para emitir a NFC-e.
     *
     * @param array $dados Dados da venda/produtos/cliente
     * @return array Retorna XML, resposta da SEFAZ e o protocolo de autorização
     */
    public function emitir(array $dados): array
    {
        try {

            $make = new Make();

            // ================
            //  MONTAGEM NFC-e
            // ================
            $this->montarInfNFe($make, $dados);
            $this->montarIde($make, $dados);
            $this->montarEmit($make, $dados);
            $this->montarEnderEmit($make, $dados);
            $this->montarDest($make, $dados);
            $this->montarProd($make, $dados);
            $this->montarImposto($make, $dados);

            $this->montarICMS($make);
            $this->montarPIS($make);
            $this->montarCOFINS($make);
            $this->montarTransp($make);
            $this->montarPag($make);


            // Monta o XML
            if (!$make->monta()) {
                throw new Exception("Erro ao montar XML NFC-e: " . implode(", ", $make->getErrors()));
            }
            $xml = $make->getXML();

            // Assinar
            $xmlAssinado = $this->tools->signNFe($xml);

            // ========================
            // ENVIO PARA A SEFAZ
            // ========================
            $idLote = str_pad(1, 15, '0', STR_PAD_LEFT);

            $response = $this->tools->sefazEnviaLote([$xmlAssinado], $idLote, 1);

            $std = new Standardize($response);
            $respObj = $std->toStd();

            if ($respObj->cStat != 104) {
                throw new Exception("Lote não processado: {$respObj->cStat} - {$respObj->xMotivo}");
            }

            if ($respObj->protNFe->infProt->cStat != 100) {
                throw new Exception("NFC-e não autorizada: {$respObj->protNFe->infProt->cStat} - {$respObj->protNFe->infProt->xMotivo}");
            }

            // ========================
            //  PROTOCOLO + XML FINAL
            // ========================
            $authorizedXml = Complements::toAuthorize($xmlAssinado, $response);
            file_put_contents(storage_path('app/nfce_protocolado.xml'), $authorizedXml);

            return [
                'xml'           => $xmlAssinado,
                'response'      => $response,
                'authorizedXml' => $authorizedXml
            ];
        } catch (Exception $e) {
            throw new Exception("Erro ao emitir NFC-e: " . $e->getMessage());
        }
    }

    // Funções para montar cada seção do XML (métodos similares ao exemplo)

    private function montarInfNFe($make)
    {
        $std = new \stdClass();
        $std->Id = '';
        $std->versao = '4.00';
        return $make->taginfNFe($std);
    }

    private function montarIde($make)
    {
        $std = new \stdClass();
        $std->cUF = 29;               // Código do estado
        $std->cNF = rand(10000000, 99999999);
        $std->natOp = 'VENDA';
        $std->mod = 65;               // NFC-e
        $std->serie = 1;
        $std->nNF = 1;                // ou nº sequencial da sua base
        $std->dhEmi = date('c');
        $std->tpNF = 1;               // 1=Saída
        $std->idDest = 1;
        $std->cMunFG = 2927408;       // código IBGE do emitente
        $std->tpImp = 4;              // DANFE NFC-e
        $std->tpEmis = 1;             // Normal
        $std->cDV = 1;
        $std->tpAmb = 2;              // Homologação
        $std->finNFe = 1;             // Normal
        $std->indFinal = 1;
        $std->indPres = 1;            // Presencial
        $std->procEmi = 0;
        $std->verProc = '1.0';

        return $make->tagide($std);
    }

    private function montarEmit($make)
    {
        $std = new \stdClass();
        $std->CNPJ = '96825575001194';
        $std->xNome = 'Intermaritima Portos e Logistica';
        $std->xFant = 'Intermaritima';
        $std->IE = '64825710';
        $std->CRT = 1; // Simples Nacional (1,2,3)
        return $make->tagemit($std);
    }


    private function montarEnderEmit($make)
    {
        $std = new \stdClass();
        $std->xLgr = 'Avenida Getúlio Vargas';
        $std->nro = '100';
        $std->xBairro = 'Centro';
        $std->cMun = 2927408;
        $std->xMun = 'Salvador';
        $std->UF = 'BA';
        $std->CEP = '40000000';
        return $make->tagenderemit($std);
    }

    private function montarDest($make)
    {
        $std = new \stdClass();
        $std->CPF = '12345678909';
        $std->xNome = 'Cliente';
        $std->indIEDest = 9; // não contribuinte
        return $make->tagdest($std);
    }

    private function montarProd($make)
    {
        $std = new \stdClass();
        $std->item = 1;
        $std->cProd = '001';
        $std->cEAN = 'SEM GTIN';
        $std->xProd = 'CAMISETA REGATA GG';
        $std->NCM = '61091000';
        $std->CFOP = '5102';
        $std->uCom = 'UN';
        $std->qCom = '1.00';
        $std->vUnCom = '25.00';
        $std->vProd = '25.00';
        $std->cEANTrib = 'SEM GTIN';
        $std->uTrib = 'UN';
        $std->qTrib = '1.00';
        $std->vUnTrib = '25.00';
        $std->indTot = 1;

        return $make->tagprod($std);
    }


    private function montarImposto($make)
    {
        $std = new \stdClass();
        $std->item = 1;
        $std->vTotTrib = 25.00;
        return $make->tagimposto($std);
    }

    private function montarICMS($make)
    {
        $std = new \stdClass();
        $std->item = 1;
        $std->orig = 0;
        $std->CSOSN = '102'; // Simples Nacional
        return $make->tagICMSSN($std);
    }

    private function montarPIS($make)
    {
        $std = new \stdClass();
        $std->item = 1;
        $std->CST = '07';
        $std->vBC = 0.00;
        $std->pPIS = 0.00;
        $std->vPIS = 0.00;

        return $make->tagPIS($std);
    }

    private function montarCOFINS($make)
    {
        $std = new \stdClass();
        $std->item = 1;
        $std->CST = '07';
        $std->vBC = 0.00;
        $std->pCOFINS = 0.00;
        $std->vCOFINS = 0.00;

        return $make->tagCOFINS($std);
    }


    private function montarTransp($make)
    {
        $std = new \stdClass();
        $std->modFrete = 9; // 9 = Sem frete
        return $make->tagtransp($std);
    }

    private function montarPag($make)
    {
        // TAG <pag>
        $stdPag = new \stdClass();
        $make->tagpag($stdPag);

        // TAG <detPag>
        $stdDet = new \stdClass();
        $stdDet->tPag = '01';  // 01 = Dinheiro
        $stdDet->vPag = 25.00; // valor do pagamento
        $make->tagdetPag($stdDet);
    }
}
