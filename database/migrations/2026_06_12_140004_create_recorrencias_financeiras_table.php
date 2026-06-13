<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recorrencias_financeiras', function (Blueprint $t) {
            $t->id();
            $t->foreignId('id_empresa')->nullable()->constrained('configuracoes_empresa')->nullOnDelete();
            $t->enum('tipo', ['pagar', 'receber']);
            $t->foreignId('plano_conta_id')->nullable()->constrained('planos_contas')->nullOnDelete();
            $t->string('descricao', 200);
            $t->decimal('valor', 14, 2);
            $t->enum('frequencia', ['mensal', 'semanal', 'quinzenal', 'anual'])->default('mensal');
            $t->date('proxima_geracao');
            $t->date('ate')->nullable();
            $t->boolean('ativo')->default(true);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recorrencias_financeiras');
    }
};
