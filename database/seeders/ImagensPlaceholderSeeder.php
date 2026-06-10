<?php

namespace Database\Seeders;

use App\Models\Produto;
use Illuminate\Database\Seeder;

class ImagensPlaceholderSeeder extends Seeder
{
    /**
     * Paleta (RGB) e emoji-glyph por categoria. Gera placeholders
     * com gradiente da cor da categoria + inicial + nome do produto.
     */
    private array $cores = [
        'Capas para Celular'      => [124, 58, 237],   // violet
        'Películas e Protetores'  => [14, 165, 233],   // sky
        'Carregadores'            => [22, 163, 74],    // green
        'Cabos USB'               => [202, 138, 4],    // amber
        'Fones de Ouvido'         => [219, 39, 119],   // pink
        'Caixas de Som Bluetooth' => [147, 51, 234],   // purple
        'Suportes e Acessórios'   => [13, 148, 136],   // teal
        'Power Banks'             => [220, 38, 38],     // red
    ];

    private string $fonte = 'C:\\Windows\\Fonts\\arialbd.ttf';

    public function run(): void
    {
        if (! extension_loaded('gd')) {
            $this->command->error('Extensão GD não disponível.');
            return;
        }

        $fonte = is_file($this->fonte) ? $this->fonte : null;

        $produtos = Produto::query()->where('visivel_ecommerce', true)->get();
        $total = $produtos->count();
        $this->command->info("Gerando imagens para {$total} produtos...");

        foreach ($produtos as $produto) {
            if ($produto->getFirstMedia('images')) {
                continue; // idempotente
            }

            $catNome = optional($produto->categoria)->nome ?? 'Acessório';
            $cor = $this->cores[$catNome] ?? [100, 116, 139];

            $png = $this->gerarPng($produto->nome, $catNome, $cor, $fonte);

            $produto->addMediaFromString($png)
                ->usingFileName($produto->slug.'.png')
                ->usingName($produto->nome)
                ->toMediaCollection('images');

            $this->command->getOutput()->write('.');
        }

        $this->command->getOutput()->writeln('');
        $this->command->info('Imagens geradas. Rode "php artisan queue:work --stop-when-empty" para processar as conversões (thumb/medium/large).');
    }

    private function gerarPng(string $nome, string $categoria, array $cor, ?string $fonte): string
    {
        $w = 800;
        $h = 800;
        $img = imagecreatetruecolor($w, $h);

        [$r, $g, $b] = $cor;

        // Gradiente diagonal: topo claro -> base na cor da categoria
        for ($y = 0; $y < $h; $y++) {
            $t = $y / $h;
            $cr = (int) ($r + (255 - $r) * (1 - $t) * 0.85);
            $cg = (int) ($g + (255 - $g) * (1 - $t) * 0.85);
            $cb = (int) ($b + (255 - $b) * (1 - $t) * 0.85);
            $linha = imagecolorallocate($img, min(255, $cr), min(255, $cg), min(255, $cb));
            imagefilledrectangle($img, 0, $y, $w, $y, $linha);
        }

        // Círculo translúcido com a inicial
        $branco = imagecolorallocatealpha($img, 255, 255, 255, 40);
        imagefilledellipse($img, $w / 2, 320, 280, 280, $branco);

        $corEscura = imagecolorallocate($img, (int) ($r * 0.6), (int) ($g * 0.6), (int) ($b * 0.6));
        $inicial = mb_strtoupper(mb_substr($nome, 0, 1));

        if ($fonte) {
            // Inicial grande no círculo
            $bbox = imagettfbbox(140, 0, $fonte, $inicial);
            $larguraTexto = $bbox[2] - $bbox[0];
            imagettftext($img, 140, 0, (int) (($w - $larguraTexto) / 2), 375, $corEscura, $fonte, $inicial);

            // Label da categoria (uppercase, topo)
            $branco2 = imagecolorallocate($img, 255, 255, 255);
            $cat = mb_strtoupper($categoria);
            $bboxCat = imagettfbbox(22, 0, $fonte, $cat);
            $lc = $bboxCat[2] - $bboxCat[0];
            imagettftext($img, 22, 0, (int) (($w - $lc) / 2), 100, $branco2, $fonte, $cat);

            // Nome do produto (quebra em até 3 linhas)
            $linhas = $this->quebrarTexto($nome, $fonte, 30, $w - 120);
            $yTexto = 560;
            foreach (array_slice($linhas, 0, 3) as $linha) {
                $bb = imagettfbbox(30, 0, $fonte, $linha);
                $ll = $bb[2] - $bb[0];
                imagettftext($img, 30, 0, (int) (($w - $ll) / 2), $yTexto, $branco2, $fonte, $linha);
                $yTexto += 46;
            }
        } else {
            $branco2 = imagecolorallocate($img, 255, 255, 255);
            imagestring($img, 5, (int) ($w / 2 - 40), 300, $inicial, $corEscura);
            imagestring($img, 4, 40, 560, $nome, $branco2);
        }

        ob_start();
        imagepng($img);
        $png = ob_get_clean();
        imagedestroy($img);

        return $png;
    }

    private function quebrarTexto(string $texto, string $fonte, int $tamanho, int $larguraMax): array
    {
        $palavras = explode(' ', $texto);
        $linhas = [];
        $atual = '';

        foreach ($palavras as $palavra) {
            $teste = $atual === '' ? $palavra : $atual.' '.$palavra;
            $bbox = imagettfbbox($tamanho, 0, $fonte, $teste);
            $largura = $bbox[2] - $bbox[0];

            if ($largura > $larguraMax && $atual !== '') {
                $linhas[] = $atual;
                $atual = $palavra;
            } else {
                $atual = $teste;
            }
        }

        if ($atual !== '') {
            $linhas[] = $atual;
        }

        return $linhas;
    }
}
