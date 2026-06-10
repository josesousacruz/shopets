<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        foreach (['produtos', 'categorias', 'clientes'] as $tabela) {
            Schema::table($tabela, function (Blueprint $table) {
                $table->unsignedBigInteger('id_empresa')->default(1);
            });

            DB::table($tabela)->update(['id_empresa' => 1]);

            Schema::table($tabela, function (Blueprint $table) use ($tabela) {
                $table->index('id_empresa', $tabela.'_id_empresa_index');
            });
        }
    }

    public function down(): void
    {
        foreach (['produtos', 'categorias', 'clientes'] as $tabela) {
            Schema::table($tabela, function (Blueprint $table) use ($tabela) {
                $table->dropIndex($tabela.'_id_empresa_index');
                $table->dropColumn('id_empresa');
            });
        }
    }
};
