<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pagamentos_pedido', function (Blueprint $table) {
            $table->id('id_pagamento_pedido');
            $table->foreignId('id_pedido')->constrained('pedidos', 'id_pedido')->cascadeOnDelete();
            $table->enum('gateway', ['mercadopago', 'asaas', 'stripe', 'fake', 'retirada_loja'])->default('fake');
            $table->string('gateway_id_externo', 191)->nullable();
            $table->enum('metodo', ['pix', 'cartao_credito', 'boleto', 'dinheiro', 'outros'])->default('pix');
            $table->enum('status', ['pendente', 'aprovado', 'rejeitado', 'estornado'])->default('pendente');
            $table->decimal('valor', 10, 2);
            $table->json('dados_brutos')->nullable();
            $table->timestamp('processado_em')->nullable();
            $table->timestamps();

            $table->index('id_pedido');
            $table->index('gateway_id_externo');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagamentos_pedido');
    }
};
