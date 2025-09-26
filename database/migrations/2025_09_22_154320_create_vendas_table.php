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
        Schema::create('vendas', function (Blueprint $table) {
            $table->id('id_venda');
            $table->string('numero_venda', 20)->unique();
            $table->foreignId('id_cliente')->nullable()->constrained('clientes', 'id_cliente')->onDelete('set null');
            $table->foreignId('id_usuario')->constrained('users')->onDelete('restrict');
            $table->foreignId('id_pdv')->constrained('pontos_venda', 'id_pdv')->onDelete('restrict');
            $table->decimal('valor_subtotal', 10, 2);
            $table->decimal('valor_desconto', 10, 2)->default(0.00);
            $table->decimal('valor_acrescimo', 10, 2)->default(0.00);
            $table->decimal('valor_total', 10, 2);
            $table->decimal('pontos_fidelidade_utilizados', 10, 2)->default(0.00);
            $table->decimal('pontos_fidelidade_gerados', 10, 2)->default(0.00);
            $table->enum('status', ['aberta', 'finalizada', 'cancelada', 'devolvida'])->default('aberta');
            $table->text('observacoes')->nullable();
            $table->timestamp('data_venda')->useCurrent();
            $table->timestamps();
            
            // Indexes
            $table->index('numero_venda');
            $table->index('id_cliente');
            $table->index('id_usuario');
            $table->index('id_pdv');
            $table->index('status');
            $table->index('data_venda');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendas');
    }
};
