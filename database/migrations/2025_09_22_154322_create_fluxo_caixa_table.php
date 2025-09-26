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
        Schema::create('fluxo_caixa', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->unsignedBigInteger('id_pdv');
            $table->foreign('id_pdv')->references('id_pdv')->on('pontos_venda')->onDelete('restrict');
            $table->enum('tipo_operacao', ['entrada', 'saida']);
            $table->decimal('valor', 10, 2);
            $table->string('descricao', 200);
            $table->enum('categoria', ['venda', 'compra', 'despesa', 'receita', 'outros']);
            $table->timestamps();
            
            // Indexes
            $table->index('user_id');
            $table->index('id_pdv');
            $table->index('tipo_operacao');
            $table->index('categoria');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fluxo_caixa');
    }
};
