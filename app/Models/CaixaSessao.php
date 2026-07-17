<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaixaSessao extends Model
{
    protected $table = 'caixa_sessoes';

    protected $fillable = [
        'id_pdv',
        'id_usuario_abertura',
        'id_usuario_fechamento',
        'valor_abertura',
        'valor_fechamento_informado',
        'valor_fechamento_calculado',
        'diferenca',
        'status',
        'observacoes',
        'aberta_em',
        'fechada_em',
    ];

    protected $casts = [
        'valor_abertura' => 'decimal:2',
        'valor_fechamento_informado' => 'decimal:2',
        'valor_fechamento_calculado' => 'decimal:2',
        'diferenca' => 'decimal:2',
        'aberta_em' => 'datetime',
        'fechada_em' => 'datetime',
    ];

    public function pontoVenda(): BelongsTo
    {
        return $this->belongsTo(PontoVenda::class, 'id_pdv', 'id_pdv');
    }

    public function usuarioAbertura(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_usuario_abertura');
    }

    public function usuarioFechamento(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_usuario_fechamento');
    }
}
