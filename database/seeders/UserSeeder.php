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
            ['email' => 'admin@cruztech.com'],
            [
                'name' => 'Administrador',
                'cpf' => '123.456.789-00',
                'password' => Hash::make('Cruz@Tech#2025'),
                'email_verified_at' => now(),
                'ativo' => true,
            ]
        );
        $admin->assignRole('admin');
    }
}