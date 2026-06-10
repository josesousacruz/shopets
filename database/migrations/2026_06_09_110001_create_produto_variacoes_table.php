<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('produto_variacoes', function (Blueprint $table) {
            $table->id('id_variacao');
            $table->foreignId('id_produto')->constrained('produtos', 'id_produto')->cascadeOnDelete();
            $table->string('sku', 60)->unique();
            $table->string('nome_variacao', 150);
            $table->json('atributos')->nullable();
            $table->decimal('preco_venda', 10, 2);
            $table->decimal('preco_promocional', 10, 2)->nullable();
            $table->decimal('estoque_atual', 10, 3)->default(0);
            $table->decimal('estoque_minimo', 10, 3)->default(0);
            $table->unsignedInteger('peso_gramas')->nullable();
            $table->decimal('altura_cm', 6, 2)->nullable();
            $table->decimal('largura_cm', 6, 2)->nullable();
            $table->decimal('comprimento_cm', 6, 2)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['id_produto', 'ativo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produto_variacoes');
    }
};
