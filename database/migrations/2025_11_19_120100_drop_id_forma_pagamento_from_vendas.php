<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            if (Schema::hasColumn('vendas', 'id_forma_pagamento')) {
                $table->dropForeign(['id_forma_pagamento']);
                $table->dropColumn('id_forma_pagamento');
            }
        });
    }

    public function down(): void
    {
        Schema::table('vendas', function (Blueprint $table) {
            if (!Schema::hasColumn('vendas', 'id_forma_pagamento')) {
                $table->unsignedBigInteger('id_forma_pagamento')->nullable()->after('id_pdv');
                $table->foreign('id_forma_pagamento')->references('id_forma_pagamento')->on('formas_pagamento');
            }
        });
    }
};