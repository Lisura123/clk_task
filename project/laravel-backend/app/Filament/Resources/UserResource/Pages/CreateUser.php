<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

class CreateUser extends CreateRecord
{
    protected static string $resource = UserResource::class;
    
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Auto-populate department field from department_id
        if (isset($data['department_id'])) {
            $department = \App\Models\Department::find($data['department_id']);
            $data['department'] = $department ? $department->name : null;
        }
        
        return $data;
    }
}
