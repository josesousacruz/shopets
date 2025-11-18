<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Etapa 1: Adicionar novos valores aos enums existentes
        Schema::table('contas_receber', function (Blueprint $table) {
            $table->enum('categoria', ['venda_prazo', 'venda', 'servico', 'outros'])->change();
            $table->enum('tipo_documento', ['duplicata', 'promissoria', 'cheque', 'boleto', 'nota_fiscal', 'recibo', 'outros'])->change();
        });

        // Etapa 2: Atualizar os dados existentes
        DB::table('contas_receber')
            ->where('categoria', 'venda_prazo')
            ->update(['categoria' => 'venda']);
            
        DB::table('contas_receber')
            ->whereIn('tipo_documento', ['duplicata', 'promissoria', 'cheque'])
            ->update(['tipo_documento' => 'outros']);

        // Etapa 3: Remover valores antigos dos enums
        Schema::table('contas_receber', function (Blueprint $table) {
            $table->enum('categoria', ['venda', 'servico', 'outros'])->change();
            $table->enum('tipo_documento', ['nota_fiscal', 'boleto', 'recibo', 'outros'])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Passo 1: Expandir temporariamente o enum para permitir valores atuais antes de reduzir
        Schema::table('contas_receber', function (Blueprint $table) {
            $table->enum('categoria', ['venda', 'venda_prazo', 'servico', 'outros'])->change();
        });

        // Passo 2: Converter dados atuais para valores compatíveis com o enum original
        DB::table('contas_receber')
            ->where('categoria', 'venda')
            ->update(['categoria' => 'venda_prazo']);

        // Passo 3: Reduzir o enum para o conjunto original
        Schema::table('contas_receber', function (Blueprint $table) {
            $table->enum('categoria', ['venda_prazo', 'servico', 'outros'])->change();
        });

        // Tipo de documento pode ser revertido diretamente para o conjunto original
        Schema::table('contas_receber', function (Blueprint $table) {
            $table->enum('tipo_documento', ['duplicata', 'promissoria', 'cheque', 'boleto', 'outros'])->change();
        });
    }
};
