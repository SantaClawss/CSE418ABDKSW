<?php
declare(strict_types=1);

require __DIR__ . '/../../src/db.php';

session_start();

// CORS headers
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
    echo json_encode(['ok' => false, 'error' => 'You must be logged in to view your reports']);
    exit;
}

try {
    $pdo = db();
    $userId = (int)$_SESSION['user_id'];

    $stmt = $pdo->prepare("
        SELECT 
            id,
            disease         AS diseaseType,
            state           AS location,
            cases,
            report_date,
            created_at,
            status                            -- ← Added this
        FROM outbreaks
        WHERE User_ID = :userId
        ORDER BY created_at DESC
        LIMIT 100
    ");

    $stmt->execute([':userId' => $userId]);

    $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Nicer date formatting
    foreach ($reports as &$report) {
        if (!empty($report['created_at'])) {
            $report['created_at'] = date('Y-m-d H:i:s', strtotime($report['created_at']));
        }
        if (!empty($report['report_date'])) {
            $report['report_date'] = date('Y-m-d', strtotime($report['report_date']));
        }
    }
    unset($report);

    echo json_encode([
        'ok'      => true,
        'reports' => $reports,
        'count'   => count($reports)
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'error' => 'Server error: ' . $e->getMessage()
    ]);
}