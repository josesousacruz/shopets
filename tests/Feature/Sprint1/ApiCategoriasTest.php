<?php

namespace Tests\Feature\Sprint1;

use App\Models\Categoria;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiCategoriasTest extends TestCase
{
    use RefreshDatabase;

    public function test_lista_categorias_visiveis_ordenadas(): void
    {
        Categoria::create(['nome' => 'B', 'slug' => 'b', 'ordem' => 2, 'ativo' => true, 'visivel_ecommerce' => true]);
        Categoria::create(['nome' => 'A', 'slug' => 'a', 'ordem' => 1, 'ativo' => true, 'visivel_ecommerce' => true]);
        Categoria::create(['nome' => 'Z', 'slug' => 'z', 'ordem' => 3, 'ativo' => true, 'visivel_ecommerce' => false]);

        $response = $this->getJson('/api/v1/categorias');

        $response->assertOk()->assertJsonCount(2, 'data');
        $this->assertSame(['a', 'b'], collect($response->json('data'))->pluck('slug')->all());
    }
}
