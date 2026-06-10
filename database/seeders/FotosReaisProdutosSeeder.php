<?php

namespace Database\Seeders;

use App\Models\Produto;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Http;

/**
 * Baixa fotos reais (Flickr Creative Commons via loremflickr) por
 * palavra-chave da categoria e substitui os placeholders. Idempotente
 * com --force: re-baixa sempre (use ImagensPlaceholderSeeder pra voltar).
 */
class FotosReaisProdutosSeeder extends Seeder
{
    private array $keywords = [
        'Capas para Celular'      => 'smartphone,case',
        'Películas e Protetores'  => 'smartphone,screen',
        'Carregadores'            => 'phone,charger',
        'Cabos USB'               => 'usb,cable',
        'Fones de Ouvido'         => 'earphones,headphones',
        'Caixas de Som Bluetooth' => 'bluetooth,speaker',
        'Suportes e Acessórios'   => 'phone,stand,holder',
        'Power Banks'             => 'powerbank,battery',
    ];

    public function run(): void
    {
        $produtos = Produto::query()->where('visivel_ecommerce', true)->get();
        $this->command->info("Baixando fotos reais para {$produtos->count()} produtos...");

        $ok = 0;
        $falhou = 0;

        foreach ($produtos as $produto) {
            $catNome = optional($produto->categoria)->nome ?? 'Capas para Celular';
            $kw = $this->keywords[$catNome] ?? 'smartphone,accessory';
            $url = "https://loremflickr.com/800/800/{$kw}?lock={$produto->id_produto}";

            try {
                $resp = Http::timeout(40)->retry(2, 800)->get($url);

                if ($resp->successful()
                    && strlen($resp->body()) > 5000
                    && str_starts_with($resp->header('Content-Type', ''), 'image/')
                ) {
                    // Substitui a imagem atual (placeholder ou anterior)
                    $produto->clearMediaCollection('images');
                    $produto->addMediaFromString($resp->body())
                        ->usingFileName($produto->slug.'.jpg')
                        ->usingName($produto->nome)
                        ->toMediaCollection('images');

                    $ok++;
                    $this->command->getOutput()->write('.');
                } else {
                    $falhou++;
                    $this->command->getOutput()->write('x');
                }
            } catch (\Throwable $e) {
                $falhou++;
                $this->command->getOutput()->write('x');
            }

            usleep(250_000); // 0.25s entre downloads, gentil com o serviço
        }

        $this->command->getOutput()->writeln('');
        $this->command->info("Fotos baixadas: {$ok} ok, {$falhou} falharam.");
        $this->command->info('Rode "php artisan queue:work --stop-when-empty" para gerar conversões (thumb/medium/large).');
    }
}
