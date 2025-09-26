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
        Schema::create('contas_receber', function (Blueprint $table) {
            $table->id('id_conta_receber');
            $table->string('numero_documento', 50)->nullable();
            $table->string('descricao', 200);
            $table->unsignedBigInteger('id_cliente')->nullable();
            $table->foreign('id_cliente')->references('id_cliente')->on('clientes')->onDelete('set null');
            $table->unsignedBigInteger('id_venda')->nullable();
            $table->foreign('id_venda')->references('id_venda')->on('vendas')->onDelete('set null');
            $table->unsignedBigInteger('id_pdv');
            $table->foreign('id_pdv')->references('id_pdv')->on('pontos_venda')->onDelete('restrict');
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->decimal('valor_original', 10, 2);
            $table->decimal('valor_recebido', 10, 2)->default(0);
            $table->decimal('valor_desconto', 10, 2)->default(0);
            $table->decimal('valor_juros', 10, 2)->default(0);
            $table->decimal('valor_multa', 10, 2)->default(0);
            $table->date('data_vencimento');
            $table->date('data_recebimento')->nullable();
            $table->enum('status', ['pendente', 'recebido', 'vencido', 'cancelado'])->default('pendente');
            $table->enum('categoria', ['venda_prazo', 'servico', 'outros']);
            $table->enum('tipo_documento', ['duplicata', 'promissoria', 'cheque', 'boleto', 'outros']);
            $table->text('observacoes')->nullable();
            $table->integer('numero_parcela')->default(1);
            $table->integer('total_parcelas')->default(1);
            $table->unsignedBigInteger('id_conta_origem')->nullable(); // Para parcelas relacionadas
            $table->foreign('id_conta_origem')->references('id_conta_receber')->on('contas_receber')->onDelete('cascade');
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            
            // Índices para performance
            $table->index(['id_cliente', 'status']);
            $table->index(['id_venda', 'status']);
            $table->index(['id_pdv', 'data_vencimento']);
            $table->index(['status', 'data_vencimento']);
            $table->index(['categoria', 'status']);
            $table->index('data_vencimento');
            $table->index('data_recebimento');
            $table->index('numero_documento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contas_receber');
    }
};
