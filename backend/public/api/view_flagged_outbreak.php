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

// Check login
if (!isset($_SESSION['user_id']) || !is_numeric($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'You must be logged in']);
    exit;
}

try {
    $pdo = db();

    // Only fetch outbreaks that are pending
    $stmt = $pdo->prepare("
        SELECT 
            id,
            disease,
            state,
            cases,
            report_date,
            created_at,
            disease_type,
            User_ID,
            status
        FROM outbreaks
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 100
    ");

    $stmt->execute();
    $outbreaks = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format for frontend
    foreach ($outbreaks as &$o) {
        $o['diseaseType'] = $o['disease'];   // make it consistent for frontend    
        $o['location']    = $o['state'];
        $o['date_flagged'] = !empty($o['created_at']) ? date('Y-m-d H:i:s', strtotime($o['created_at'])) : null;
        $o['reportedBy']   = $o['User_ID'] ?? 'Unknown';
        unset($o['disease_type'], $o['state'], $o['created_at'], $o['User_ID']);
    }
    unset($o);

    echo json_encode([
        'ok' => true,
        'outbreaks' => $outbreaks,
        'count' => count($outbreaks)
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}