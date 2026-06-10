<?php

namespace Tests\Feature\Sprint5;

use App\Models\Cupom;
use Tests\TestCase;

class CupomTest extends TestCase
{
    public function test_percentual_calcula_desconto(): void
    {
        $cupom = new Cupom(['tipo' => 'percentual', 'valor' => 10, 'ativo' => true]);
        $res = $cupom->validarPara(200);

        $this->assertTrue($res['valido']);
        $this->assertSame(20.0, $res['desconto']);
        $this->assertFalse($res['frete_gratis']);
    }

    public function test_valor_fixo_limita_ao_subtotal(): void
    {
        $cupom = new Cupom(['tipo' => 'valor_fixo', 'valor' => 50, 'ativo' => true]);
        $this->assertSame(50.0, $cupom->validarPara(200)['desconto']);
        $this->assertSame(30.0, $cupom->validarPara(30)['desconto']);
    }

    public function test_frete_gratis_marca_flag_sem_desconto(): void
    {
        $cupom = new Cupom(['tipo' => 'frete_gratis', 'valor' => 0, 'ativo' => true]);
        $res = $cupom->validarPara(200);

        $this->assertTrue($res['valido']);
        $this->assertSame(0.0, $res['desconto']);
        $this->assertTrue($res['frete_gratis']);
    }

    public function test_expirado_rejeitado(): void
    {
        $cupom = new Cupom([
            'tipo' => 'percentual', 'valor' => 10, 'ativo' => true,
            'valido_ate' => now()->subDay(),
        ]);

        $this->assertFalse($cupom->validarPara(200)['valido']);
    }

    public function test_uso_maximo_atingido_rejeitado(): void
    {
        $cupom = new Cupom([
            'tipo' => 'percentual', 'valor' => 10, 'ativo' => true,
            'uso_maximo' => 5, 'usos_atuais' => 5,
        ]);

        $this->assertFalse($cupom->validarPara(200)['valido']);
    }

    public function test_subtotal_abaixo_do_minimo_rejeitado(): void
    {
        $cupom = new Cupom([
            'tipo' => 'percentual', 'valor' => 10, 'ativo' => true,
            'valor_minimo_pedido' => 100,
        ]);

        $this->assertFalse($cupom->validarPara(50)['valido']);
    }

    public function test_inativo_rejeitado(): void
    {
        $cupom = new Cupom(['tipo' => 'percentual', 'valor' => 10, 'ativo' => false]);
        $this->assertFalse($cupom->validarPara(200)['valido']);
    }
}
