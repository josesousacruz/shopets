<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recebimentos_compra', function (Blueprint $t) {
            $t->id();
            $t->foreignId('pedido_compra_id')->constrained('pedidos_compra')->cascadeOnDelete();
            $t->date('data');
            $t->string('nota_fiscal')->nullable();
            $t->text('observacoes')->nullable();
            $t->foreignId('recebido_por')->constrained('users');
            $t->timestamps();

            $t->index('pedido_compra_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recebimentos_compra');
    }
};
