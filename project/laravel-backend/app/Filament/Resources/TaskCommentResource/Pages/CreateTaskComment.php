<?php

namespace App\Filament\Resources\TaskCommentResource\Pages;

use App\Filament\Resources\TaskCommentResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;

class CreateTaskComment extends CreateRecord
{
    protected static string $resource = TaskCommentResource::class;
}
