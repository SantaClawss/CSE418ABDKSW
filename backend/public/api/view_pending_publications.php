<?php
declare(strict_types=1);

require __DIR__ . '/../../src/db.php';
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed. Use GET.']);
    exit;
}

if (!isset($_SESSION['user_id']) || !is_numeric($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'You must be logged in']);
    exit;
}

try {
    $pdo = db();

    $stmt = $pdo->prepare("
        SELECT
            up.id,
            up.user_id,
            up.title,
            up.authors,
            up.journal,
            up.publication_year,
            up.publication_date,
            up.origin_url,
            up.uploaded_original_filename,
            up.uploaded_file_path,
            up.publication_type,
            up.created_at,
            u.first_name,
            u.last_name
        FROM user_publications up
        LEFT JOIN users u ON u.id = up.user_id
        WHERE up.approval_status = 'pending'
        ORDER BY up.created_at DESC, up.id DESC
        LIMIT 100
    ");
    $stmt->execute();
    $publications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($publications as &$p) {
        $fullName = trim(((string)($p['first_name'] ?? '')) . ' ' . ((string)($p['last_name'] ?? '')));
        $p['submitted_by_name'] = $fullName !== '' ? $fullName : ('User #' . (string)$p['user_id']);
        $p['uploaded_file_url'] = !empty($p['uploaded_file_path'])
            ? '/CSE442/2026-Spring/cse-442c/backend/public/api/index.php?r=publications-download&id=' . (int)$p['id']
            : '';

        unset($p['first_name'], $p['last_name']);
    }
    unset($p);

    echo json_encode([
        'ok' => true,
        'publications' => $publications,
        'count' => count($publications),
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}