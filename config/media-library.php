<?php

return [
    /*
     * O disco no qual armazenar arquivos de mídia adicionados.
     */
    'disk_name' => env('MEDIA_DISK', 'public'),

    /*
     * O tamanho máximo de arquivo de um item que pode ser adicionado
     * à biblioteca de mídia. O valor é especificado em bytes.
     */
    'max_file_size' => 1024 * 1024 * 10, // 10MB

    /*
     * Esta fila será usada para gerar conversões derivadas.
     * Deixe vazio para usar a fila padrão.
     */
    'queue_name' => '',

    /*
     * Por padrão, todas as conversões serão executadas na fila.
     * Defina isso como false se quiser executar conversões de forma síncrona.
     */
    'queue_conversions_by_default' => env('QUEUE_CONVERSIONS', true),

    /*
     * O nome da classe do modelo de mídia totalmente qualificado.
     */
    'media_model' => Spatie\MediaLibrary\MediaCollections\Models\Media::class,

    /*
     * O nome da classe do modelo de mídia temporária totalmente qualificado.
     */
    'temporary_upload_model' => Spatie\MediaLibrary\MediaCollections\Models\Media::class,

    /*
     * Quando habilitado, tentará otimizar SVGs usando `spatie/svg-optimizer`.
     */
    'optimize_svg' => false,

    /*
     * Essas são as extensões de arquivo que são consideradas imagens.
     */
    'image_extensions' => [
        'jpg',
        'jpeg',
        'png',
        'gif',
        'webp',
        'svg',
    ],

    /*
     * Quando uma imagem é adicionada, essas extensões serão
     * consideradas imagens e serão processadas.
     */
    'image_generators' => [
        Spatie\MediaLibrary\Conversions\ImageGenerators\Image::class,
        Spatie\MediaLibrary\Conversions\ImageGenerators\Webp::class,
        Spatie\MediaLibrary\Conversions\ImageGenerators\Pdf::class,
        Spatie\MediaLibrary\Conversions\ImageGenerators\Svg::class,
        Spatie\MediaLibrary\Conversions\ImageGenerators\Video::class,
    ],

    /*
     * O caminho onde os arquivos temporários serão armazenados.
     */
    'temporary_directory_path' => null,

    /*
     * Configurações de otimização de imagem
     */
    'image_optimizers' => [
        Spatie\ImageOptimizer\Optimizers\Jpegoptim::class => [
            '-m85', // Qualidade 85%
            '--strip-all',
            '--all-progressive',
        ],
        Spatie\ImageOptimizer\Optimizers\Pngquant::class => [
            '--force',
        ],
        Spatie\ImageOptimizer\Optimizers\Optipng::class => [
            '-i0',
            '-o2',
            '-quiet',
        ],
        Spatie\ImageOptimizer\Optimizers\Svgo::class => [
            '--disable=cleanupIDs',
        ],
        Spatie\ImageOptimizer\Optimizers\Gifsicle::class => [
            '-b',
            '-O3',
        ],
    ],

    /*
     * Essas classes serão usadas para executar tarefas de otimização de imagem.
     */
    'image_optimizer' => Spatie\ImageOptimizer\OptimizerChain::class,

    /*
     * Configurações de conversão de imagem
     */
    'conversion_disk' => env('CONVERSION_DISK', 'public'),

    /*
     * Configurações de geração de URL
     */
    'url_generator' => Spatie\MediaLibrary\Support\UrlGenerator\DefaultUrlGenerator::class,

    /*
     * Configurações de validação
     */
    'enable_vapor_uploads' => env('ENABLE_VAPOR_UPLOADS', false),

    /*
     * Configurações de resposta
     */
    'responsive_images' => [
        'width_calculator' => Spatie\MediaLibrary\ResponsiveImages\WidthCalculator\FileSizeOptimizedWidthCalculator::class,
        'use_tiny_placeholders' => true,
        'tiny_placeholder_generator' => Spatie\MediaLibrary\ResponsiveImages\TinyPlaceholderGenerator\Blurred::class,
    ],
];