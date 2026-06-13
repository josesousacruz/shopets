<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contas_pagar', function (Blueprint $t) {
            if (! Schema::hasColumn('contas_pagar', 'plano_conta_id')) {
                $t->foreignId('plano_conta_id')->nullable()->after('categoria')->constrained('planos_contas')->nullOnDelete();
            }
            if (! Schema::hasColumn('contas_pagar', 'conta_bancaria_id')) {
                $t->foreignId('conta_bancaria_id')->nullable()->after('plano_conta_id')->constrained('contas_bancarias')->nullOnDelete();
            }
        });

        Schema::table('contas_receber', function (Blueprint $t) {
            if (! Schema::hasColumn('contas_receber', 'plano_conta_id')) {
                $t->foreignId('plano_conta_id')->nullable()->after('categoria')->constrained('planos_contas')->nullOnDelete();
            }
            if (! Schema::hasColumn('contas_receber', 'conta_bancaria_id')) {
                $t->foreignId('conta_bancaria_id')->nullable()->after('plano_conta_id')->constrained('contas_bancarias')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('contas_pagar', function (Blueprint $t) {
            $t->dropConstrainedForeignId('plano_conta_id');
            $t->dropConstrainedForeignId('conta_bancaria_id');
        });
        Schema::table('contas_receber', function (Blueprint $t) {
            $t->dropConstrainedForeignId('plano_conta_id');
            $t->dropConstrainedForeignId('conta_bancaria_id');
        });
    }
};
