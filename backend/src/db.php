<?php
// this file provides a function to get a PDO database connection using credentials from config.php
declare(strict_types=1);
function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfg = require __DIR__ . '/config.php';
    $dsn = sprintf(
        "mysql:host=%s;dbname=%s;charset=utf8mb4",
        $cfg['db_host'],
        $cfg['db_name']
    );
    $pdo = new PDO($dsn, $cfg['db_user'], $cfg['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    return $pdo;
}

// Alias for backward compatibility with code that uses getDBConnection()
function getDBConnection(): PDO { return db(); }