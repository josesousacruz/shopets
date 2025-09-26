<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('contas_pagar', function (Blueprint $table) {
            $table->id('id_conta_pagar');
            $table->string('numero_documento', 50)->nullable();
            $table->string('descricao', 200);
            $table->unsignedBigInteger('id_fornecedor')->nullable();
            $table->foreign('id_fornecedor')->references('id_fornecedor')->on('fornecedores')->onDelete('set null');
            $table->unsignedBigInteger('id_pdv');
            $table->foreign('id_pdv')->references('id_pdv')->on('pontos_venda')->onDelete('restrict');
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->decimal('valor_original', 10, 2);
            $table->decimal('valor_pago', 10, 2)->default(0);
            $table->decimal('valor_desconto', 10, 2)->default(0);
            $table->decimal('valor_juros', 10, 2)->default(0);
            $table->decimal('valor_multa', 10, 2)->default(0);
            $table->date('data_vencimento');
            $table->date('data_pagamento')->nullable();
            $table->enum('status', ['pendente', 'pago', 'vencido', 'cancelado'])->default('pendente');
            $table->enum('categoria', ['fornecedor', 'despesa_operacional', 'imposto', 'financiamento', 'outros']);
            $table->enum('tipo_documento', ['nota_fiscal', 'boleto', 'duplicata', 'recibo', 'outros']);
            $table->text('observacoes')->nullable();
            $table->integer('numero_parcela')->default(1);
            $table->integer('total_parcelas')->default(1);
            $table->unsignedBigInteger('id_conta_origem')->nullable(); // Para parcelas relacionadas
            $table->foreign('id_conta_origem')->references('id_conta_pagar')->on('contas_pagar')->onDelete('cascade');
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            
            // Índices para performance
            $table->index(['id_fornecedor', 'status']);
            $table->index(['id_pdv', 'data_vencimento']);
            $table->index(['status', 'data_vencimento']);
            $table->index(['categoria', 'status']);
            $table->index('data_vencimento');
            $table->index('data_pagamento');
            $table->index('numero_documento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contas_pagar');
    }
};
