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
        Schema::create('movimentacoes_estoque', function (Blueprint $table) {
            $table->id('id_movimentacao');
            $table->foreignId('id_produto')->constrained('produtos', 'id_produto')->onDelete('restrict');
            $table->foreignId('id_usuario')->constrained('users')->onDelete('restrict');
            $table->foreignId('id_item_venda')->nullable()->constrained('itens_venda', 'id_item')->onDelete('set null');
            $table->enum('tipo_movimentacao', ['entrada', 'saida', 'ajuste', 'venda', 'devolucao']);
            $table->decimal('quantidade', 10, 3);
            $table->decimal('valor_unitario', 10, 2)->nullable();
            $table->string('numero_documento', 50)->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamp('data_movimentacao')->useCurrent();
            $table->timestamps();
            
            // Indexes
            $table->index('id_produto');
            $table->index('id_usuario');
            $table->index('id_item_venda');
            $table->index('tipo_movimentacao');
            $table->index('data_movimentacao');
            $table->index('numero_documento');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimentacoes_estoque');
    }
};