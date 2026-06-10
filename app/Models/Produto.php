<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEmpresa;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\HasMedia;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class Produto extends Model implements HasMedia
{
    use HasFactory, LogsActivity, InteractsWithMedia, BelongsToEmpresa;

    protected $primaryKey = 'id_produto';
    public $incrementing = true;
    protected $keyType = 'int';

    protected $fillable = [
        'nome',
        'codigo_barras',
        'codigo_interno',
        'descricao',
        'preco_custo',
        'preco_venda',
        'margem_lucro',
        'estoque_atual',
        'estoque_minimo',
        'estoque_maximo',
        'unidade',
        'permite_fracao',
        'id_categoria',
        'ncm',
        'cest',
        'ativo',
        'id_empresa',
        'slug',
        'descricao_curta',
        'descricao_longa',
        'peso_gramas',
        'altura_cm',
        'largura_cm',
        'comprimento_cm',
        'meta_title',
        'meta_description',
        'og_image_path',
        'destaque',
        'novo',
        'em_promocao',
        'preco_promocional',
        'visivel_ecommerce',
    ];

    protected $casts = [
        'preco_custo' => 'decimal:2',
        'preco_venda' => 'decimal:2',
        'ativo' => 'boolean',
        'estoque_atual' => 'integer',
        'estoque_minimo' => 'integer',
        'destaque' => 'boolean',
        'novo' => 'boolean',
        'em_promocao' => 'boolean',
        'visivel_ecommerce' => 'boolean',
        'preco_promocional' => 'decimal:2',
    ];

    /**
     * Configure activity logging options.
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['nome', 'preco_custo', 'preco_venda', 'estoque_atual', 'ativo'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    /**
     * Relacionamento com categoria
     */
    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'id_categoria', 'id_categoria');
    }

    /**
     * Relacionamento com fornecedores
     */
    public function fornecedores()
    {
        return $this->belongsToMany(Fornecedor::class, 'produtos_fornecedores', 'id_produto', 'id_fornecedor')
                    ->withPivot('preco_custo_fornecedor', 'codigo_fornecedor', 'prazo_entrega_dias', 'quantidade_minima_pedido', 'fornecedor_principal', 'ativo')
                    ->withTimestamps();
    }

    /**
     * Relacionamento com itens de venda
     */
    public function itensVenda()
    {
        return $this->hasMany(ItemVenda::class);
    }

    /**
     * Relacionamento com movimentações de estoque
     */
    public function movimentacoesEstoque()
    {
        return $this->hasMany(MovimentacaoEstoque::class);
    }

    /**
     * Configuração das coleções de mídia
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('images')
              ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
    }

    /**
     * Conversões de mídia
     */
    // public function registerMediaConversions(Media $media = null): void
    // {
    //     $this->addMediaConversion('thumb')
    //           ->width(150)
    //           ->height(150)
    //           ->sharpen(10);

    //     $this->addMediaConversion('preview')
    //           ->width(500)
    //           ->height(500)
    //           ->nonQueued();
    // }

    // Scopes
    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }

    public function scopeComEstoque($query)
    {
        return $query->where('estoque_atual', '>', 0);
    }

    // Media Library - Conversões automáticas de imagem
    public function registerMediaConversions(Media $media = null): void
    {
        // Thumbnail pequeno (150x150)
        $this->addMediaConversion('thumb')
              ->fit(Fit::Crop, 150, 150)
              ->quality(85)
              ->sharpen(10);

        // Imagem média para listagens (400x300)
        $this->addMediaConversion('medium')
              ->fit(Fit::Crop, 400, 300)
              ->quality(90)
              ->sharpen(10);

        // Imagem grande para detalhes (800x600)
        $this->addMediaConversion('large')
              ->fit(Fit::Crop, 800, 600)
              ->quality(95);
    }

    // Método helper para obter URL da imagem
    public function getImageUrl($conversion = null)
    {
        $media = $this->getFirstMedia('imagens');
        
        if (!$media) {
            return null;
        }

        return $conversion ? $media->getUrl($conversion) : $media->getUrl();
    }

    /**
     * Relacionamento com entradas de estoque
     */
    public function entradasEstoque()
    {
        return $this->hasMany(EntradaEstoque::class, 'id_produto', 'id_produto');
    }

    /**
     * Obter fornecedor principal
     */
    public function getFornecedorPrincipal()
    {
        return $this->fornecedores()->wherePivot('fornecedor_principal', true)->first();
    }

    /**
     * Calcular preço médio ponderado baseado nas entradas
     */
    public function calcularPrecoMedioPonderado($diasConsiderados = 90)
    {
        return EntradaEstoque::precoMedioPonderado($this->id_produto, $diasConsiderados);
    }

    /**
     * Obter fornecedor mais barato
     */
    public function getFornecedorMaisBarato($diasConsiderados = 30)
    {
        return EntradaEstoque::fornecedorMaisBarato($this->id_produto, $diasConsiderados);
    }

    /**
     * Obter evolução de preços
     */
    public function getEvolucaoPrecos($mesesConsiderados = 6)
    {
        return EntradaEstoque::evolucaoPrecos($this->id_produto, $mesesConsiderados);
    }

    /**
     * Atualizar preço de custo baseado na média ponderada
     */
    public function atualizarPrecoCusto($diasConsiderados = 90)
    {
        $novoPreco = $this->calcularPrecoMedioPonderado($diasConsiderados);
        
        if ($novoPreco > 0) {
            $this->preco_custo = $novoPreco;
            $this->save();
            return true;
        }
        
        return false;
    }

    /**
     * Verificar se produto tem estoque baixo
     */
    public function isEstoqueBaixo($limite = 10)
    {
        return $this->estoque_atual <= $limite;
    }

    /**
     * Obter margem de lucro atual
     */
    public function getMargemLucro()
    {
        if ($this->preco_custo <= 0) {
            return 0;
        }

        return (($this->preco_venda - $this->preco_custo) / $this->preco_custo) * 100;
    }

    /**
     * Sugerir preço de venda baseado na margem desejada
     */
    public function sugerirPrecoVenda($margemDesejada = 30)
    {
        $precoCustoAtualizado = $this->calcularPrecoMedioPonderado();
        
        if ($precoCustoAtualizado <= 0) {
            return $this->preco_venda;
        }

        return $precoCustoAtualizado * (1 + ($margemDesejada / 100));
    }
}
