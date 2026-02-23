<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateFilamentAdmin extends Command
{
    protected $signature = 'filament:create-admin';
    protected $description = 'Create a Filament admin user';

    public function handle()
    {
        $name = $this->ask('Name', 'Super Admin');
        $username = $this->ask('Username', 'admin');
        
        // Check if username exists
        if (User::where('username', $username)->exists()) {
            $this->error('Username already exists!');
            return 1;
        }
        
        $email = $this->ask('Email', 'admin@clktask.com');
        
        // Check if email exists
        if (User::where('email', $email)->exists()) {
            $this->error('Email already exists!');
            return 1;
        }
        
        $password = $this->secret('Password');

        $user = User::create([
            'name' => $name,
            'username' => $username,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => 'admin',
            'status' => 'active',
            'department' => 'Administration',
        ]);

        $this->info('Admin user created successfully!');
        $this->info('You can now login at: ' . url('/admin'));
        $this->info('Username: ' . $username);
        $this->info('Email: ' . $email);
        
        return 0;
    }
}
