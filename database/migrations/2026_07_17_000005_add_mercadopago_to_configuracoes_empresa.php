<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            if (! Schema::hasColumn('configuracoes_empresa', 'mercadopago_access_token')) {
                $t->text('mercadopago_access_token')->nullable(); // cast 'encrypted'
                // O Mercado Pago não tem URL de sandbox: o ambiente é decidido pelas
                // CREDENCIAIS (token de conta de teste roteia pro ambiente de teste).
                // O flag serve de aviso/validação na tela sobre qual token colar.
                $t->boolean('mercadopago_sandbox')->default(true);
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            $t->dropColumn(['mercadopago_access_token', 'mercadopago_sandbox']);
        });
    }
};
