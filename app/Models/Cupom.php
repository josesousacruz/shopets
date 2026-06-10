<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cupom extends Model
{
    use HasFactory, BelongsToEmpresa;

    protected $table = 'cupons';
    protected $primaryKey = 'id_cupom';

    protected $fillable = [
        'id_empresa',
        'codigo',
        'tipo',
        'valor',
        'valor_minimo_pedido',
        'valido_de',
        'valido_ate',
        'uso_maximo',
        'usos_atuais',
        'ativo',
    ];

    protected $casts = [
        'valor' => 'decimal:2',
        'valor_minimo_pedido' => 'decimal:2',
        'valido_de' => 'datetime',
        'valido_ate' => 'datetime',
        'uso_maximo' => 'integer',
        'usos_atuais' => 'integer',
        'ativo' => 'boolean',
    ];

    /**
     * Valida o cupom para um determinado subtotal e calcula o desconto.
     *
     * @return array{valido:bool, desconto:float, frete_gratis:bool, motivo:?string}
     */
    public function validarPara(float $subtotal): array
    {
        $invalido = fn (string $motivo): array => [
            'valido' => false,
            'desconto' => 0.0,
            'frete_gratis' => false,
            'motivo' => $motivo,
        ];

        if (! $this->ativo) {
            return $invalido('Cupom inativo.');
        }

        $agora = now();
        if ($this->valido_de && $agora->lt($this->valido_de)) {
            return $invalido('Cupom ainda não está válido.');
        }
        if ($this->valido_ate && $agora->gt($this->valido_ate)) {
            return $invalido('Cupom expirado.');
        }

        if ($this->uso_maximo !== null && $this->usos_atuais >= $this->uso_maximo) {
            return $invalido('Cupom esgotado.');
        }

        if ($subtotal < (float) $this->valor_minimo_pedido) {
            return $invalido('Subtotal abaixo do mínimo para este cupom.');
        }

        $valor = (float) $this->valor;
        $desconto = 0.0;
        $freteGratis = false;

        switch ($this->tipo) {
            case 'percentual':
                $desconto = round($subtotal * $valor / 100, 2);
                break;
            case 'valor_fixo':
                $desconto = min($valor, $subtotal);
                break;
            case 'frete_gratis':
                $desconto = 0.0;
                $freteGratis = true;
                break;
        }

        return [
            'valido' => true,
            'desconto' => $desconto,
            'frete_gratis' => $freteGratis,
            'motivo' => null,
        ];
    }
}
