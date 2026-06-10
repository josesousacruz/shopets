<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('carrinho_itens', function (Blueprint $table) {
            $table->id('id_carrinho_item');
            $table->foreignId('id_carrinho')->constrained('carrinhos', 'id_carrinho')->cascadeOnDelete();
            $table->foreignId('id_produto')->constrained('produtos', 'id_produto')->cascadeOnDelete();
            $table->unsignedBigInteger('id_variacao')->nullable();
            $table->integer('quantidade');
            $table->decimal('preco_unit_snapshot', 10, 2);
            $table->timestamps();

            $table->unique(['id_carrinho', 'id_produto', 'id_variacao'], 'carrinho_itens_unico');

            $table->foreign('id_variacao')->references('id_variacao')->on('produto_variacoes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carrinho_itens');
    }
};
