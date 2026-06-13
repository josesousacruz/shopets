<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planos_contas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('id_empresa')->nullable()->constrained('configuracoes_empresa')->nullOnDelete();
            $t->foreignId('parent_id')->nullable()->constrained('planos_contas')->cascadeOnDelete();
            $t->enum('tipo', ['receita', 'despesa']);
            $t->string('codigo', 30);
            $t->string('nome', 120);
            $t->boolean('ativo')->default(true);
            $t->timestamps();

            $t->unique(['id_empresa', 'codigo']);
            $t->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planos_contas');
    }
};
