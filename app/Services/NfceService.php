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
            "razaosocial" => "SUA RAZÃO SOCIAL LTDA",
            "cnpj" => "99999999999999",
            "siglaUF" => "SP",
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
        $pfxcontent = file_get_contents(storage_path('app/certificados/expired_certificate.pfx'));
        
        // Inicializa a ferramenta
        $this->tools = new Tools($this->configJson, Certificate::readPfx($pfxcontent, 'associacao'));
        
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

            // Montagem da NFC-e
            $infNFe = $this->montarInfNFe($make);
            $ide = $this->montarIde($make);
            $emit = $this->montarEmit($make);
            $enderEmit = $this->montarEnderEmit($make);
            $dest = $this->montarDest($make);
            $prod = $this->montarProd($make);
            $imposto = $this->montarImposto($make);

            // Assinar o XML
            $make->monta();
            $xml = $make->getXML();
            $xmlAssinado = $this->tools->signNFe($xml);

            // Enviar para SEFAZ
            $idLote = str_pad(1, 15, '0', STR_PAD_LEFT);
            $response = $this->tools->sefazEnviaLote([$xmlAssinado], $idLote, 1); // Envio Síncrono

            // Processar resposta
            $stdCl = new Standardize($response);
            $respObj = $stdCl->toStd();

            if ($respObj->cStat != 104) {
                throw new Exception(sprintf('Lote não enviado (%s - %s)', $respObj->cStat, $respObj->xMotivo));
            }

            if ($respObj->protNFe->infProt->cStat != 100) {
                throw new Exception(sprintf('NFC-e não autorizada (%s - %s)', $respObj->protNFe->infProt->cStat, $respObj->protNFe->infProt->xMotivo));
            }

            // Salvar protocolo de autorização
            $authorizedXml = Complements::toAuthorize($xmlAssinado, $response);
            file_put_contents(storage_path('app/nfce_protocolado.xml'), $authorizedXml);

            return [
                'xml' => $xmlAssinado,
                'response' => $response,
                'authorizedXml' => $authorizedXml
            ];
        } catch (Exception $e) {
            throw new Exception('Erro ao emitir NFC-e: ' . $e->getMessage());
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
        $std->cUF = 14;
        $std->cNF = '03701267';
        // Outros dados de 'ide'...
        return $make->tagIde($std);
    }

    private function montarEmit($make)
    {
        $std = new \stdClass();
        $std->xNome = 'SUA RAZÃO SOCIAL LTDA';
        // Outros dados de 'emit'...
        return $make->tagemit($std);
    }

    private function montarEnderEmit($make)
    {
        $std = new \stdClass();
        $std->xLgr = 'Avenida Getúlio Vargas';
        // Outros dados de 'enderEmit'...
        return $make->tagenderemit($std);
    }

    private function montarDest($make)
    {
        $std = new \stdClass();
        $std->xNome = 'Eu Ltda';
        // Outros dados de 'dest'...
        return $make->tagdest($std);
    }

    private function montarProd($make)
    {
        $std = new \stdClass();
        $std->item = 1;
        $std->xProd = 'CAMISETA REGATA GG';
        // Outros dados de 'prod'...
        return $make->tagprod($std);
    }

    private function montarImposto($make)
    {
        $std = new \stdClass();
        $std->item = 1;
        $std->vTotTrib = 25.00;
        return $make->tagimposto($std);
    }
}
