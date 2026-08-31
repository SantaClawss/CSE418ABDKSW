<?php
declare(strict_types=1);
require __DIR__ . '/../../src/db.php';
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'POST required']);
    exit;
}

// Must be logged in
if (!isset($_SESSION['user_id']) || !is_numeric($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'You must be logged in']);
    exit;
}

// Must be admin
if (empty($_SESSION['is_admin'])) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Admins only']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

// Validate ID
if (!isset($input['id']) || !is_numeric($input['id'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid outbreak ID']);
    exit;
}

// Validate confidence_score: must be integer 0–100
if (!isset($input['confidence_score']) || !is_numeric($input['confidence_score'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'confidence_score must be a number']);
    exit;
}

$score = (int)$input['confidence_score'];
if ($score < 0 || $score > 100) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'confidence_score must be between 0 and 100']);
    exit;
}

$outbreakId = (int)$input['id'];

try {
    $pdo = db();
    $stmt = $pdo->prepare("
        UPDATE outbreaks
        SET confidence_score = :score
        WHERE id = :id
    ");
    $stmt->execute([':score' => $score, ':id' => $outbreakId]);

    if ($stmt->rowCount() === 0) {
        echo json_encode(['ok' => false, 'error' => 'Outbreak not found']);
    } else {
        echo json_encode(['ok' => true, 'message' => 'Confidence score saved', 'confidence_score' => $score]);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}