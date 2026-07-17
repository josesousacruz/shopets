<?php

namespace Tests\Feature\Fiscal;

use App\Models\ConfiguracaoEmpresa;
use App\Services\Fiscal\FiscalHelpers;
use RuntimeException;
use Tests\TestCase;

class FiscalHelpersTest extends TestCase
{
    public function test_codigo_uf_mapeia_estados_conhecidos(): void
    {
        $this->assertSame(29, FiscalHelpers::codigoUf('BA'));
        $this->assertSame(35, FiscalHelpers::codigoUf('sp'));
        $this->assertSame(33, FiscalHelpers::codigoUf(' RJ '));
    }

    public function test_codigo_uf_lanca_para_uf_desconhecida(): void
    {
        $this->expectException(RuntimeException::class);
        FiscalHelpers::codigoUf('XX');
    }

    public function test_tpag_mapeia_formas_de_pagamento(): void
    {
        $this->assertSame('01', FiscalHelpers::tPag('dinheiro'));
        $this->assertSame('03', FiscalHelpers::tPag('cartao_credito'));
        $this->assertSame('04', FiscalHelpers::tPag('cartao_debito'));
        $this->assertSame('17', FiscalHelpers::tPag('pix'));
        $this->assertSame('15', FiscalHelpers::tPag('boleto'));
    }

    public function test_tpag_desconhecido_cai_em_outros(): void
    {
        $this->assertSame('99', FiscalHelpers::tPag('bitcoin'));
    }

    public function test_valida_config_emissor_exige_campos_minimos(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Configuração fiscal incompleta');
        FiscalHelpers::validarConfigEmissor(null);
    }

    public function test_valida_config_emissor_rejeita_regime_nao_simples(): void
    {
        $empresa = new ConfiguracaoEmpresa([
            'cnpj' => '12345678000199',
            'endereco_cep' => '01001000',
            'endereco_codigo_ibge' => '3550308',
            'certificado_path' => 'certificados/1.pfx',
            'certificado_senha' => 'x',
            'regime_tributario' => '3',
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Simples Nacional');
        FiscalHelpers::validarConfigEmissor($empresa);
    }

    public function test_valida_config_emissor_aceita_config_completa(): void
    {
        $empresa = new ConfiguracaoEmpresa([
            'cnpj' => '12345678000199',
            'endereco_cep' => '01001000',
            'endereco_codigo_ibge' => '3550308',
            'certificado_path' => 'certificados/1.pfx',
            'certificado_senha' => 'x',
            'regime_tributario' => '1',
        ]);

        $this->assertSame($empresa, FiscalHelpers::validarConfigEmissor($empresa));
    }

    public function test_montar_emit_e_ender_emit(): void
    {
        $empresa = new ConfiguracaoEmpresa([
            'nome_empresa' => 'Loja Teste',
            'cnpj' => '12.345.678/0001-99',
            'inscricao_estadual' => '123.456.789',
            'regime_tributario' => '1',
            'endereco_logradouro' => 'Rua X',
            'endereco_numero' => '10',
            'endereco_bairro' => 'Centro',
            'endereco_cidade' => 'São Paulo',
            'endereco_uf' => 'SP',
            'endereco_cep' => '01001-000',
            'endereco_codigo_ibge' => '3550308',
        ]);

        $emit = FiscalHelpers::montarEmit($empresa);
        $this->assertSame('12345678000199', $emit->CNPJ);
        $this->assertSame(1, $emit->CRT);
        $this->assertSame('123456789', $emit->IE);

        $ender = FiscalHelpers::montarEnderEmit($empresa);
        $this->assertSame('01001000', $ender->CEP);
        $this->assertSame(3550308, $ender->cMun);
        $this->assertSame('SP', $ender->UF);
    }
}
