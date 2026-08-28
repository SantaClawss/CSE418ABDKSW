<?php
declare(strict_types=1);

function json_response(array $data, int $status = 200): void
{
    http_response_code($status);

    // JSON response + CORS (safe for class demo)
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    echo json_encode($data, JSON_UNESCAPED_SLASHES);
    exit;
}

// Handle preflight quickly (doesn’t hurt even same-origin)
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    json_response(['ok' => true], 200);
}
