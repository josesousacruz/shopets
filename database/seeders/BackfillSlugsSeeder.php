<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class BackfillSlugsSeeder extends Seeder
{
    public function run(): void
    {
        if (Schema::hasColumn('produtos', 'slug')) {
            Produto::query()->withoutGlobalScopes()->whereNull('slug')->get()->each(function (Produto $p) {
                $p->slug = $this->uniqueSlug(Produto::class, 'slug', $p->nome, $p->id_produto);
                $p->saveQuietly();
            });
        }

        if (Schema::hasColumn('categorias', 'slug')) {
            Categoria::query()->withoutGlobalScopes()->whereNull('slug')->get()->each(function (Categoria $c) {
                $c->slug = $this->uniqueSlug(Categoria::class, 'slug', $c->nome, $c->id_categoria);
                $c->saveQuietly();
            });
        }
    }

    private function uniqueSlug(string $modelClass, string $column, string $source, int $ownId): string
    {
        $base = Str::slug($source);
        $slug = $base;
        $i = 2;
        $key = (new $modelClass)->getKeyName();

        while ($modelClass::query()
            ->withoutGlobalScopes()
            ->where($column, $slug)
            ->where($key, '!=', $ownId)
            ->exists()
        ) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
