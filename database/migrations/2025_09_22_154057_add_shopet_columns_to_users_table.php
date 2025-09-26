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
        Schema::table('users', function (Blueprint $table) {
            $table->string('cpf', 14)->unique()->after('email');
            $table->enum('nivel_acesso', ['admin', 'gerente', 'vendedor'])->default('vendedor')->after('cpf');
            $table->boolean('ativo')->default(true)->after('nivel_acesso');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['cpf', 'nivel_acesso', 'ativo']);
        });
    }
};
