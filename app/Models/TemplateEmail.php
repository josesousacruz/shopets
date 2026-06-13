<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TemplateEmail extends Model
{
    protected $table = 'templates_email';

    protected $fillable = ['slug', 'nome', 'assunto', 'corpo_html', 'variaveis', 'ativo'];

    protected $casts = [
        'variaveis' => 'array',
        'ativo' => 'boolean',
    ];

    /** Renderiza assunto+corpo trocando {{var}} pelos valores dados. */
    public function render(array $dados): array
    {
        $subst = [];
        foreach ($dados as $k => $v) {
            $subst['{{'.$k.'}}'] = (string) $v;
        }

        return [
            'assunto' => strtr($this->assunto, $subst),
            'corpo_html' => strtr($this->corpo_html, $subst),
        ];
    }
}
