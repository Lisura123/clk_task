<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// API info route
Route::get('/api', function () {
    return ['message' => 'Task Management System API', 'version' => '1.0'];
});

// Catch-all route for React SPA
Route::get('/{any}', function () {
    return file_get_contents(public_path('index.html'));
})->where('any', '.*');
