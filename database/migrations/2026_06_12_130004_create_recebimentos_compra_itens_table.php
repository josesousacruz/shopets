<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recebimentos_compra_itens', function (Blueprint $t) {
            $t->id();
            $t->foreignId('recebimento_id')->constrained('recebimentos_compra')->cascadeOnDelete();
            $t->foreignId('item_id')->constrained('pedidos_compra_itens')->cascadeOnDelete();
            $t->integer('qtd_recebida');
            $t->timestamps();

            $t->index('recebimento_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recebimentos_compra_itens');
    }
};
