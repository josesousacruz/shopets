<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            // SEO da loja
            if (! Schema::hasColumn('configuracoes_empresa', 'seo_titulo')) {
                $t->string('seo_titulo', 70)->nullable();
                $t->string('seo_descricao', 200)->nullable();
                $t->string('og_image_path', 255)->nullable();
            }
            // Fiscal (NFC-e/NF-e) — ambiente 1=produção, 2=homologação
            if (! Schema::hasColumn('configuracoes_empresa', 'ambiente_nfce')) {
                $t->unsignedTinyInteger('ambiente_nfce')->default(2);
                $t->string('csc_nfce', 60)->nullable();
                $t->string('csc_id_nfce', 10)->nullable();
                $t->string('certificado_path', 255)->nullable();
                $t->text('certificado_senha')->nullable(); // cast 'encrypted'
            }
        });
    }

    public function down(): void
    {
        Schema::table('configuracoes_empresa', function (Blueprint $t) {
            $t->dropColumn([
                'seo_titulo', 'seo_descricao', 'og_image_path',
                'ambiente_nfce', 'csc_nfce', 'csc_id_nfce', 'certificado_path', 'certificado_senha',
            ]);
        });
    }
};
