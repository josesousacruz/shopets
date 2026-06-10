<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id('id_pedido');
            $table->string('numero', 30)->unique();
            $table->unsignedBigInteger('id_cliente');
            $table->unsignedBigInteger('id_empresa')->default(1);
            $table->enum('status', [
                'aguardando_pagamento',
                'aguardando_retirada',
                'pago',
                'em_separacao',
                'enviado',
                'entregue',
                'cancelado',
                'devolvido',
            ])->default('aguardando_pagamento');
            $table->enum('modalidade', ['entrega', 'retirada']);
            $table->unsignedBigInteger('id_endereco_entrega')->nullable();
            $table->unsignedBigInteger('id_ponto_venda_retirada')->nullable();
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('frete', 10, 2)->default(0);
            $table->decimal('desconto', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->string('frete_servico', 60)->nullable();
            $table->unsignedInteger('prazo_entrega_dias')->nullable();
            $table->string('codigo_rastreio', 60)->nullable();
            $table->text('observacoes')->nullable();
            $table->unsignedBigInteger('id_venda')->nullable();
            $table->timestamp('pago_em')->nullable();
            $table->timestamp('enviado_em')->nullable();
            $table->timestamp('entregue_em')->nullable();
            $table->timestamp('cancelado_em')->nullable();
            $table->timestamps();

            $table->index('id_cliente');
            $table->index('status');

            $table->foreign('id_cliente')->references('id_cliente')->on('clientes')->cascadeOnDelete();
            $table->foreign('id_endereco_entrega')->references('id_endereco')->on('enderecos_cliente')->nullOnDelete();
            $table->foreign('id_ponto_venda_retirada')->references('id_pdv')->on('pontos_venda')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedidos');
    }
};
