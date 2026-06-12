<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@admin.com'],
            [
                'name' => 'Admin',
                'cpf' => '00000000000',
                'password' => Hash::make('admin123'),
                'nivel_acesso' => 'admin',
                'ativo' => true,
            ]
        );
    }
}
