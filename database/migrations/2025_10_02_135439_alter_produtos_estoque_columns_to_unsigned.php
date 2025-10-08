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
        Schema::table('produtos', function (Blueprint $table) {
            // Alterar colunas de estoque para UNSIGNED DECIMAL
            $table->decimal('estoque_atual', 10, 3)->unsigned()->default(0)->change();
            $table->decimal('estoque_minimo', 10, 3)->unsigned()->default(0)->change();
            $table->decimal('estoque_maximo', 10, 3)->unsigned()->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('produtos', function (Blueprint $table) {
            // Reverter para DECIMAL normal
            $table->decimal('estoque_atual', 10, 3)->default(0)->change();
            $table->decimal('estoque_minimo', 10, 3)->default(0)->change();
            $table->decimal('estoque_maximo', 10, 3)->nullable()->change();
        });
    }
};
