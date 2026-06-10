<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('devolucoes_pedido', function (Blueprint $table) {
            $table->id('id_devolucao');
            $table->unsignedBigInteger('id_pedido');
            $table->unsignedBigInteger('id_cliente');
            $table->text('motivo');
            $table->enum('status', ['solicitada', 'aprovada', 'recebida', 'reembolsada', 'rejeitada'])
                ->default('solicitada');
            $table->decimal('valor_reembolso', 10, 2)->nullable();
            $table->text('observacao_admin')->nullable();
            $table->timestamps();

            $table->index('id_pedido');
            $table->index('status');

            $table->foreign('id_pedido')->references('id_pedido')->on('pedidos')->cascadeOnDelete();
            $table->foreign('id_cliente')->references('id_cliente')->on('clientes')->cascadeOnDelete();
        });

        Schema::create('devolucao_itens', function (Blueprint $table) {
            $table->id('id_devolucao_item');
            $table->unsignedBigInteger('id_devolucao');
            $table->unsignedBigInteger('id_pedido_item');
            $table->decimal('quantidade', 10, 2);
            $table->timestamps();

            $table->foreign('id_devolucao')->references('id_devolucao')->on('devolucoes_pedido')->cascadeOnDelete();
            $table->foreign('id_pedido_item')->references('id_pedido_item')->on('pedido_itens')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devolucao_itens');
        Schema::dropIfExists('devolucoes_pedido');
    }
};
