<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contas_bancarias', function (Blueprint $t) {
            $t->id();
            $t->foreignId('id_empresa')->nullable()->constrained('configuracoes_empresa')->nullOnDelete();
            $t->enum('tipo', ['banco', 'caixa', 'cartao', 'digital'])->default('banco');
            $t->string('nome', 120);
            $t->string('banco', 80)->nullable();
            $t->string('agencia', 20)->nullable();
            $t->string('conta', 30)->nullable();
            $t->decimal('saldo_inicial', 14, 2)->default(0);
            $t->date('data_saldo_inicial')->nullable();
            $t->boolean('ativo')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contas_bancarias');
    }
};
