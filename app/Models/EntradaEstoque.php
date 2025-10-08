<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class EntradaEstoque extends Model
{
    protected $table = 'entradas_estoque';
    protected $primaryKey = 'id_entrada';

    protected $fillable = [
        'id_produto',
        'id_fornecedor',
        'quantidade',
        'preco_unitario',
        'valor_total',
        'numero_nota_fiscal',
        'data_entrada',
        'id_usuario',
        'observacoes'
    ];

    protected $casts = [
        'quantidade' => 'decimal:3',
        'preco_unitario' => 'decimal:2',
        'valor_total' => 'decimal:2',
        'data_entrada' => 'datetime'
    ];

    // Relacionamentos
    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class, 'id_produto', 'id_produto');
    }

    public function fornecedor(): BelongsTo
    {
        return $this->belongsTo(Fornecedor::class, 'id_fornecedor', 'id_fornecedor');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'id_usuario', 'id');
    }

    // Métodos estáticos para estatísticas
    public static function precoMedioPonderado($idProduto, $diasConsiderados = null)
    {
        $query = self::where('id_produto', $idProduto);
        
        if ($diasConsiderados) {
            $dataLimite = Carbon::now()->subDays($diasConsiderados);
            $query->where('data_entrada', '>=', $dataLimite);
        }

        $entradas = $query->get();
        
        if ($entradas->isEmpty()) {
            return 0;
        }

        $valorTotal = $entradas->sum('valor_total');
        $quantidadeTotal = $entradas->sum('quantidade');

        return $quantidadeTotal > 0 ? $valorTotal / $quantidadeTotal : 0;
    }

    public static function fornecedorMaisBarato($idProduto, $diasConsiderados = 30)
    {
        $dataLimite = Carbon::now()->subDays($diasConsiderados);
        
        return self::where('id_produto', $idProduto)
            ->where('data_entrada', '>=', $dataLimite)
            ->with('fornecedor')
            ->orderBy('preco_unitario', 'asc')
            ->first();
    }

    public static function evolucaoPrecos($idProduto, $mesesConsiderados = 6)
    {
        $dataLimite = Carbon::now()->subMonths($mesesConsiderados);
        
        return self::where('id_produto', $idProduto)
            ->where('data_entrada', '>=', $dataLimite)
            ->selectRaw('
                YEAR(data_entrada) as ano,
                MONTH(data_entrada) as mes,
                AVG(preco_unitario) as preco_medio,
                COUNT(*) as total_entradas
            ')
            ->groupBy('ano', 'mes')
            ->orderBy('ano', 'desc')
            ->orderBy('mes', 'desc')
            ->get();
    }

    public static function estatisticasFornecedor($idFornecedor, $diasConsiderados = 90)
    {
        $dataLimite = Carbon::now()->subDays($diasConsiderados);
        
        return self::where('id_fornecedor', $idFornecedor)
            ->where('data_entrada', '>=', $dataLimite)
            ->selectRaw('
                COUNT(*) as total_entradas,
                SUM(quantidade) as quantidade_total,
                SUM(valor_total) as valor_total,
                AVG(preco_unitario) as preco_medio,
                MIN(preco_unitario) as menor_preco,
                MAX(preco_unitario) as maior_preco
            ')
            ->first();
    }

    // Scope para filtros comuns
    public function scopeUltimos30Dias($query)
    {
        return $query->where('data_entrada', '>=', Carbon::now()->subDays(30));
    }

    public function scopePorProduto($query, $idProduto)
    {
        return $query->where('id_produto', $idProduto);
    }

    public function scopePorFornecedor($query, $idFornecedor)
    {
        return $query->where('id_fornecedor', $idFornecedor);
    }
}
