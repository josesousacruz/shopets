<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos_compra_itens', function (Blueprint $t) {
            $t->id();
            $t->foreignId('pedido_compra_id')->constrained('pedidos_compra')->cascadeOnDelete();
            $t->unsignedBigInteger('produto_variacao_id');
            $t->foreign('produto_variacao_id')->references('id_variacao')->on('produto_variacoes')->cascadeOnDelete();
            $t->integer('qtd');
            $t->integer('qtd_recebida')->default(0);
            $t->decimal('custo_unit', 12, 4);
            $t->decimal('total', 14, 2);
            $t->timestamps();

            $t->index('pedido_compra_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedidos_compra_itens');
    }
};
