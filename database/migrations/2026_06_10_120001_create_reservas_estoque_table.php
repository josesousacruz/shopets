<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reservas_estoque', function (Blueprint $table) {
            $table->id('id_reserva');
            $table->unsignedBigInteger('id_carrinho')->nullable();
            $table->unsignedBigInteger('id_pedido')->nullable();
            $table->foreignId('id_produto')->constrained('produtos', 'id_produto')->cascadeOnDelete();
            $table->unsignedBigInteger('id_variacao')->nullable();
            $table->decimal('quantidade', 10, 3);
            $table->timestamp('expira_em');
            $table->timestamp('consumida_em')->nullable();
            $table->timestamps();

            $table->index(['id_produto', 'id_variacao']);
            $table->index('expira_em');
            $table->index('consumida_em');

            $table->foreign('id_variacao')->references('id_variacao')->on('produto_variacoes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservas_estoque');
    }
};
