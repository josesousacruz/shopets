<?php

return [
    /*
     * Se habilitado, o pacote registrará automaticamente uma atividade
     * quando um modelo for criado, atualizado ou excluído.
     */
    'enabled' => env('ACTIVITY_LOGGER_ENABLED', true),

    /*
     * Quando a limpeza automática estiver habilitada, os registros de atividade
     * mais antigos que o número especificado de dias serão excluídos.
     */
    'delete_records_older_than_days' => 30,

    /*
     * Se nenhum log_name for passado para a função activity(),
     * usaremos este log_name padrão.
     */
    'default_log_name' => 'default',

    /*
     * Você pode especificar um modelo de autenticação aqui que será usado para
     * recuperar o usuário atual. Quando este for null, usaremos o modelo padrão
     * de autenticação do Laravel.
     */
    'default_auth_driver' => null,

    /*
     * Se definido como true, o subject retornará soft deleted models.
     */
    'subject_returns_soft_deleted_models' => false,

    /*
     * Esta tabela será criada pela migração e será usada para
     * armazenar todos os logs de atividade.
     */
    'table_name' => 'activity_log',

    /*
     * Esta é a classe de modelo que será usada para registrar atividades.
     * Deve implementar a interface Spatie\Activitylog\Contracts\Activity.
     */
    'activity_model' => \Spatie\Activitylog\Models\Activity::class,
];