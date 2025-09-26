<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Criar usuários padrões
        $admin = User::firstOrCreate(
            ['email' => 'admin@shopet.com'],
            [
                'name' => 'Administrador',
                'cpf' => '123.456.789-00',
                'password' => Hash::make('admin123'),
                'email_verified_at' => now(),
                'ativo' => true,
            ]
        );
        $admin->assignRole('admin');

        $gerente = User::firstOrCreate(
            ['email' => 'maria@shopet.com'],
            [
                'name' => 'Maria Silva',
                'cpf' => '987.654.321-11',
                'password' => Hash::make('123456'),
                'email_verified_at' => now(),
                'ativo' => true,
            ]
        );
        $gerente->assignRole('gerente');

        $operador = User::firstOrCreate(
            ['email' => 'joao@shopet.com'],
            [
                'name' => 'João Santos',
                'cpf' => '456.789.123-22',
                'password' => Hash::make('123456'),
                'email_verified_at' => now(),
                'ativo' => true,
            ]
        );
        $operador->assignRole('operador');

        // Usuários adicionais para teste
        $ana = User::firstOrCreate(
            ['email' => 'ana@shopet.com'],
            [
                'name' => 'Ana Costa',
                'cpf' => '789.123.456-33',
                'password' => Hash::make('123456'),
                'email_verified_at' => now(),
                'ativo' => true,
            ]
        );
        $ana->assignRole('operador');

        $carlos = User::firstOrCreate(
            ['email' => 'carlos@shopet.com'],
            [
                'name' => 'Carlos Oliveira',
                'cpf' => '321.654.987-44',
                'password' => Hash::make('123456'),
                'email_verified_at' => now(),
                'ativo' => true,
            ]
        );
        $carlos->assignRole('gerente');
    }
}