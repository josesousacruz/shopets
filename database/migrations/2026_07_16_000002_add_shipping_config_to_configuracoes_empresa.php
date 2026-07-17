<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            if (! Schema::hasColumn('configuracoes_empresa', 'shipping_driver')) {
                // stub (padrão/simulado) | melhorenvio
                $t->string('shipping_driver', 20)->default('stub');
            }
            // Endereço estruturado da loja (remetente) — usado na compra de etiqueta
            // real (Melhor Envio) e na emissão fiscal (NF-e/NFC-e). O campo livre
            // `endereco` continua existindo pra exibição (rodapé etc).
            if (! Schema::hasColumn('configuracoes_empresa', 'endereco_cep')) {
                $t->string('endereco_cep', 9)->nullable();
                $t->string('endereco_logradouro', 150)->nullable();
                $t->string('endereco_numero', 20)->nullable();
                $t->string('endereco_complemento', 100)->nullable();
                $t->string('endereco_bairro', 100)->nullable();
                $t->string('endereco_cidade', 100)->nullable();
                $t->string('endereco_uf', 2)->nullable();
                // Código IBGE do município — exigido pela SEFAZ (cMunFG), não pelo ME.
                $t->string('endereco_codigo_ibge', 7)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            $t->dropColumn([
                'shipping_driver',
                'endereco_cep', 'endereco_logradouro', 'endereco_numero', 'endereco_complemento',
                'endereco_bairro', 'endereco_cidade', 'endereco_uf', 'endereco_codigo_ibge',
            ]);
        });
    }
};
