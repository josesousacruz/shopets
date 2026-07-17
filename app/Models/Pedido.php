<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    use BelongsToEmpresa, HasFactory;

    protected $table = 'pedidos';

    protected $primaryKey = 'id_pedido';

    protected $fillable = [
        'numero',
        'id_cliente',
        'id_empresa',
        'status',
        'modalidade',
        'pagamento_modo',
        'id_endereco_entrega',
        'id_ponto_venda_retirada',
        'subtotal',
        'frete',
        'desconto',
        'total',
        'frete_servico',
        'frete_servico_id',
        'prazo_entrega_dias',
        'codigo_rastreio',
        'etiqueta_url',
        'id_cupom',
        'observacoes',
        'id_venda',
        'nfe_chave',
        'nfe_numero',
        'nfe_danfe_url',
        'pago_em',
        'enviado_em',
        'entregue_em',
        'cancelado_em',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'frete' => 'decimal:2',
        'desconto' => 'decimal:2',
        'total' => 'decimal:2',
        'prazo_entrega_dias' => 'integer',
        'pago_em' => 'datetime',
        'enviado_em' => 'datetime',
        'entregue_em' => 'datetime',
        'cancelado_em' => 'datetime',
    ];

    public function itens(): HasMany
    {
        return $this->hasMany(PedidoItem::class, 'id_pedido', 'id_pedido');
    }

    public function eventos(): HasMany
    {
        return $this->hasMany(PedidoEvento::class, 'id_pedido', 'id_pedido');
    }

    public function reservas(): HasMany
    {
        return $this->hasMany(ReservaEstoque::class, 'id_pedido', 'id_pedido');
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'id_cliente', 'id_cliente');
    }

    public function enderecoEntrega(): BelongsTo
    {
        return $this->belongsTo(EnderecoCliente::class, 'id_endereco_entrega', 'id_endereco');
    }

    public function pontoVendaRetirada(): BelongsTo
    {
        return $this->belongsTo(PontoVenda::class, 'id_ponto_venda_retirada', 'id_pdv');
    }

    public function devolucoes(): HasMany
    {
        return $this->hasMany(DevolucaoPedido::class, 'id_pedido', 'id_pedido');
    }

    /**
     * Gera um número sequencial por ano: "PED-2026-000001".
     * Deve ser chamado dentro de transação com lock para evitar colisões.
     */
    public static function gerarNumero(): string
    {
        $ano = now()->year;
        $prefixo = "PED-{$ano}-";

        $ultimo = static::withoutGlobalScopes()
            ->where('numero', 'like', $prefixo.'%')
            ->orderByDesc('numero')
            ->lockForUpdate()
            ->value('numero');

        $seq = $ultimo ? ((int) substr($ultimo, strlen($prefixo))) + 1 : 1;

        return $prefixo.str_pad((string) $seq, 6, '0', STR_PAD_LEFT);
    }
}
