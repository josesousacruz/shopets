<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;

class DatabaseTriggersTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function test_check_triggers_command_exists()
    {
        // Verificar se o comando existe
        $commands = Artisan::all();
        $this->assertArrayHasKey('db:check-triggers', $commands);
    }

    /** @test */
    public function test_check_triggers_command_handles_unsupported_database()
    {
        // Com SQLite (usado nos testes), o comando deve retornar erro
        $this->artisan('db:check-triggers')
            ->expectsOutput('❌ Este comando só funciona com MySQL/MariaDB')
            ->assertExitCode(1);
    }

    /** @test */
    public function test_migration_file_exists()
    {
        // Verificar se o arquivo de migration existe
        $migrationPath = database_path('migrations/2025_10_02_143636_update_stock_triggers_to_finalized_sales.php');
        $this->assertFileExists($migrationPath);
    }

    /** @test */
    public function test_migration_has_required_methods()
    {
        // Verificar se a migration tem os métodos necessários
        $migrationPath = database_path('migrations/2025_10_02_143636_update_stock_triggers_to_finalized_sales.php');
        $content = file_get_contents($migrationPath);
        
        $this->assertStringContainsString('triggerExists', $content);
        $this->assertStringContainsString('listStockTriggers', $content);
        $this->assertStringContainsString('tr_atualizar_estoque_venda_finalizada', $content);
        $this->assertStringContainsString('tr_remover_item_venda_nao_finalizada', $content);
    }

    /** @test */
    public function test_command_class_exists()
    {
        // Verificar se a classe do comando existe
        $this->assertTrue(class_exists(\App\Console\Commands\CheckDatabaseTriggers::class));
    }

    /** @test */
    public function test_command_is_properly_configured()
    {
        // Verificar se o comando está registrado corretamente
        $this->artisan('list')
            ->expectsOutputToContain('db:check-triggers')
            ->assertExitCode(0);
    }
}