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

// Only check if user is logged in
if (!isset($_SESSION['user_id']) || !is_numeric($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'You must be logged in to view reports']);
    exit;
}

try {
    $pdo = db();

    $stmt = $pdo->prepare("
        SELECT 
            id,
            disease         AS diseaseType,
            state           AS location,
            cases,
            report_date,
            created_at,
            status,
            User_ID         AS reporter_id
        FROM outbreaks
        WHERE status IS NOT NULL          -- Added filter
        ORDER BY created_at DESC
        LIMIT 500
    ");

    $stmt->execute();
    $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format dates
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