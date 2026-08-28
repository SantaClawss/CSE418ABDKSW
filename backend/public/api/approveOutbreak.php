<?php
declare(strict_types=1);
require __DIR__ . '/../../src/db.php';
session_start();

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed. Use POST.']);
    exit;
}

// Check login
if (!isset($_SESSION['user_id']) || !is_numeric($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'You must be logged in']);
    exit;
}

// Read POST JSON
$input = json_decode(file_get_contents('php://input'), true);
if (!isset($input['id']) || !is_numeric($input['id'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid outbreak ID']);
    exit;
}

$outbreakId = (int)$input['id'];

try {
    $pdo = db();

    $stmt = $pdo->prepare("
        UPDATE outbreaks
        SET status = 'approved'
        WHERE id = :id AND status = 'pending'
    ");

    $stmt->execute([':id' => $outbreakId]);

    if ($stmt->rowCount() === 0) {
        echo json_encode(['ok' => false, 'error' => 'Outbreak not found or already processed']);
    } else {
        echo json_encode(['ok' => true, 'message' => 'Outbreak approved']);
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}