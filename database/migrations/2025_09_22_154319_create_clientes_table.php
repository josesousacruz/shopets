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
        Schema::create('clientes', function (Blueprint $table) {
            $table->id('id_cliente');
            $table->string('nome', 150);
            $table->string('cpf_cnpj', 20)->unique()->nullable();
            $table->string('email', 150)->nullable();
            $table->string('telefone', 20)->nullable();
            $table->text('endereco')->nullable();
            $table->date('data_nascimento')->nullable();
            $table->enum('tipo_pessoa', ['fisica', 'juridica'])->default('fisica');
            $table->decimal('pontos_fidelidade', 10, 2)->default(0.00);
            $table->decimal('limite_credito', 10, 2)->default(0.00);
            $table->decimal('credito_utilizado', 10, 2)->default(0.00);
            $table->boolean('ativo')->default(true);
            $table->text('observacoes')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index('cpf_cnpj');
            $table->index('email');
            $table->index('nome');
            $table->index('ativo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};