<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos_compra', function (Blueprint $t) {
            $t->id();
            $t->string('numero', 30)->unique();
            $t->foreignId('id_empresa')->nullable()->constrained('configuracoes_empresa')->nullOnDelete();
            $t->unsignedBigInteger('fornecedor_id');
            $t->foreign('fornecedor_id')->references('id_fornecedor')->on('fornecedores')->cascadeOnDelete();
            $t->foreignId('deposito_id')->constrained('depositos');
            $t->enum('status', ['rascunho', 'enviado', 'parcialmente_recebido', 'recebido', 'cancelado'])->default('rascunho');
            $t->date('previsao_entrega')->nullable();
            $t->decimal('subtotal', 14, 2)->default(0);
            $t->decimal('frete', 14, 2)->default(0);
            $t->decimal('desconto', 14, 2)->default(0);
            $t->decimal('total', 14, 2)->default(0);
            $t->string('condicao_pagamento')->nullable();
            $t->text('observacoes')->nullable();
            $t->foreignId('criado_por')->constrained('users');
            $t->timestamp('enviado_em')->nullable();
            $t->timestamp('cancelado_em')->nullable();
            $t->timestamps();

            $t->index(['status', 'fornecedor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedidos_compra');
    }
};
