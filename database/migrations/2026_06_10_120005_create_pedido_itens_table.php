<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pedido_itens', function (Blueprint $table) {
            $table->id('id_pedido_item');
            $table->foreignId('id_pedido')->constrained('pedidos', 'id_pedido')->cascadeOnDelete();
            $table->unsignedBigInteger('id_produto')->nullable();
            $table->unsignedBigInteger('id_variacao')->nullable();
            $table->string('nome', 200);
            $table->string('sku', 60)->nullable();
            $table->decimal('preco_unit', 10, 2);
            $table->integer('quantidade');
            $table->decimal('subtotal', 10, 2);
            $table->timestamps();

            $table->foreign('id_produto')->references('id_produto')->on('produtos')->nullOnDelete();
            $table->foreign('id_variacao')->references('id_variacao')->on('produto_variacoes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedido_itens');
    }
};
