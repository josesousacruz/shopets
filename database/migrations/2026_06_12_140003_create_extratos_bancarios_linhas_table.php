<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('extratos_bancarios_linhas', function (Blueprint $t) {
            $t->id();
            $t->foreignId('conta_bancaria_id')->constrained('contas_bancarias')->cascadeOnDelete();
            $t->date('data');
            $t->decimal('valor', 14, 2);
            $t->string('memo')->nullable();
            $t->string('fitid')->nullable();
            $t->string('tipo_ofx', 20)->nullable();
            $t->unsignedBigInteger('reconciliada_com_pagar_id')->nullable();
            $t->foreign('reconciliada_com_pagar_id')->references('id_conta_pagar')->on('contas_pagar')->nullOnDelete();
            $t->unsignedBigInteger('reconciliada_com_receber_id')->nullable();
            $t->foreign('reconciliada_com_receber_id')->references('id_conta_receber')->on('contas_receber')->nullOnDelete();
            $t->timestamp('reconciliada_em')->nullable();
            $t->timestamps();

            $t->unique(['conta_bancaria_id', 'fitid']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('extratos_bancarios_linhas');
    }
};
