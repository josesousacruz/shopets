<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CheckDatabaseTriggers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:check-triggers {--fix : Tentar corrigir triggers ausentes automaticamente}';

    /**
     * The description of the console command.
     *
     * @var string
     */
    protected $description = 'Verificar integridade das triggers do banco de dados';

    /**
     * Triggers esperadas no sistema
     */
    private array $expectedTriggers = [
        'tr_atualizar_estoque_venda_finalizada' => [
            'table' => 'vendas',
            'event' => 'AFTER UPDATE',
            'description' => 'Atualiza estoque quando venda é finalizada ou cancelada'
        ],
        'tr_remover_item_venda_nao_finalizada' => [
            'table' => 'itens_venda',
            'event' => 'AFTER DELETE',
            'description' => 'Impede remoção de itens de vendas finalizadas'
        ],
        'tr_atualizar_valor_total_venda' => [
            'table' => 'itens_venda',
            'event' => 'AFTER INSERT/UPDATE/DELETE',
            'description' => 'Atualiza valor total da venda'
        ],
        'tr_verificar_estoque_minimo' => [
            'table' => 'produtos',
            'event' => 'AFTER UPDATE',
            'description' => 'Verifica estoque mínimo dos produtos'
        ],
        'tr_gerar_numero_venda' => [
            'table' => 'vendas',
            'event' => 'BEFORE INSERT',
            'description' => 'Gera número sequencial para vendas'
        ],
        'tr_fluxo_caixa_venda' => [
            'table' => 'vendas',
            'event' => 'AFTER UPDATE',
            'description' => 'Registra movimentação no fluxo de caixa'
        ]
    ];

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔍 Verificando integridade das triggers do banco de dados...');
        $this->newLine();

        // Verificar se estamos usando MySQL/MariaDB
        if (!$this->isDatabaseSupported()) {
            $this->error('❌ Este comando só funciona com MySQL/MariaDB');
            return 1;
        }

        // Obter triggers existentes
        $existingTriggers = $this->getExistingTriggers();
        
        // Verificar cada trigger esperada
        $missingTriggers = [];
        $foundTriggers = [];

        foreach ($this->expectedTriggers as $triggerName => $triggerInfo) {
            if ($this->triggerExists($triggerName, $existingTriggers)) {
                $foundTriggers[] = $triggerName;
                $this->info("✅ {$triggerName} - OK");
            } else {
                $missingTriggers[] = $triggerName;
                $this->error("❌ {$triggerName} - AUSENTE");
            }
        }

        $this->newLine();

        // Verificar triggers antigas que não deveriam existir
        $oldTriggers = $this->checkOldTriggers($existingTriggers);
        if (!empty($oldTriggers)) {
            $this->warn('⚠️  Triggers antigas encontradas (podem causar conflitos):');
            foreach ($oldTriggers as $oldTrigger) {
                $this->warn("   - {$oldTrigger}");
            }
            $this->newLine();
        }

        // Resumo
        $this->info("📊 Resumo da verificação:");
        $this->info("   ✅ Triggers encontradas: " . count($foundTriggers));
        $this->info("   ❌ Triggers ausentes: " . count($missingTriggers));
        $this->info("   ⚠️  Triggers antigas: " . count($oldTriggers));

        // Se há triggers ausentes
        if (!empty($missingTriggers)) {
            $this->newLine();
            $this->error('🚨 Algumas triggers estão ausentes! Isso pode causar problemas no sistema.');
            
            if ($this->option('fix')) {
                $this->attemptFix($missingTriggers);
            } else {
                $this->info('💡 Use --fix para tentar corrigir automaticamente');
                $this->info('💡 Ou execute: php artisan migrate:refresh --path=database/migrations/2025_10_02_143636_update_stock_triggers_to_finalized_sales.php');
            }
            
            return 1;
        }

        $this->newLine();
        $this->info('🎉 Todas as triggers estão funcionando corretamente!');
        return 0;
    }

    /**
     * Verificar se o banco de dados é suportado
     */
    private function isDatabaseSupported(): bool
    {
        $driver = config('database.default');
        $connection = config("database.connections.{$driver}.driver");
        return in_array($connection, ['mysql', 'mariadb']);
    }

    /**
     * Obter triggers existentes no banco
     */
    private function getExistingTriggers(): array
    {
        try {
            $triggers = DB::select('SHOW TRIGGERS');
            return array_column($triggers, 'Trigger');
        } catch (\Exception $e) {
            $this->error('Erro ao obter triggers: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Verificar se uma trigger existe
     */
    private function triggerExists(string $triggerName, array $existingTriggers): bool
    {
        return in_array($triggerName, $existingTriggers);
    }

    /**
     * Verificar triggers antigas que não deveriam existir
     */
    private function checkOldTriggers(array $existingTriggers): array
    {
        $oldTriggers = [
            'tr_atualizar_estoque_venda' // Trigger antiga que deveria ter sido removida
        ];

        return array_intersect($oldTriggers, $existingTriggers);
    }

    /**
     * Tentar corrigir triggers ausentes
     */
    private function attemptFix(array $missingTriggers): void
    {
        $this->newLine();
        $this->info('🔧 Tentando corrigir triggers ausentes...');

        if ($this->confirm('Deseja executar a migration para recriar as triggers?')) {
            try {
                $this->call('migrate:refresh', [
                    '--path' => 'database/migrations/2025_10_02_143636_update_stock_triggers_to_finalized_sales.php'
                ]);
                
                $this->info('✅ Migration executada com sucesso!');
                $this->info('🔍 Verificando novamente...');
                
                // Verificar novamente
                $this->call('db:check-triggers');
                
            } catch (\Exception $e) {
                $this->error('❌ Erro ao executar migration: ' . $e->getMessage());
                $this->info('💡 Tente executar manualmente: php artisan migrate:refresh --path=database/migrations/2025_10_02_143636_update_stock_triggers_to_finalized_sales.php');
            }
        }
    }
}