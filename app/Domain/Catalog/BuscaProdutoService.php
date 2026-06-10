<?php

namespace App\Domain\Catalog;

use App\Models\Produto;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class BuscaProdutoService
{
    public function buscar(string $termo): Builder
    {
        $termo = trim($termo);

        $query = Produto::query()
            ->where('visivel_ecommerce', true)
            ->where('ativo', true)
            ->with(['categoria']);

        if ($termo === '') {
            return $query;
        }

        if (DB::getDriverName() === 'mysql') {
            $query->whereRaw(
                'MATCH(nome, descricao_curta, descricao_longa) AGAINST(? IN NATURAL LANGUAGE MODE)',
                [$termo]
            );
        } else {
            $like = '%'.$termo.'%';
            $query->where(function ($q) use ($like) {
                $q->where('nome', 'like', $like)
                  ->orWhere('descricao_curta', 'like', $like)
                  ->orWhere('descricao_longa', 'like', $like);
            });
        }

        return $query;
    }
}
