<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('produtos_fornecedores', function (Blueprint $t) {
            if (! Schema::hasColumn('produtos_fornecedores', 'codigo_no_fornecedor')) {
                $t->string('codigo_no_fornecedor', 80)->nullable()->after('codigo_fornecedor');
            }
        });
    }

    public function down(): void
    {
        Schema::table('produtos_fornecedores', function (Blueprint $t) {
            $t->dropColumn('codigo_no_fornecedor');
        });
    }
};
