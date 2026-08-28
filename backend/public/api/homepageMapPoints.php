<?php
declare(strict_types=1);

require __DIR__ . '/../../src/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $pdo          = db();
    $disease      = isset($_GET['disease']) ? trim((string)$_GET['disease']) : '';
    $disease_type = isset($_GET['disease_type']) ? trim((string)$_GET['disease_type']) : '';

    $where  = [];
    $params = [];

    if ($disease !== '') {
        $where[]  = 'disease = ?';
        $params[] = $disease;
    }

    if ($disease_type !== '') {
        $where[]  = 'disease_type = ?';
        $params[] = $disease_type;
    }

    $whereSQL = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    // Row-level outbreak records for the homepage dot-plot map.
    // County may be NULL; the frontend will fall back to state-center coordinates.
    $stmt = $pdo->prepare("
        SELECT
            id,
            disease,
            state,
            county,
            cases,
            report_date,
            created_at,
            disease_type,
            mortality_status,
            status
        FROM outbreaks
        $whereSQL
        ORDER BY report_date DESC, id DESC
    ");

    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$row) {
        $row['id']    = (int)$row['id'];
        $row['cases'] = (int)$row['cases'];
    }
    unset($row);

    echo json_encode($rows, JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);

    $is_local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);

    if ($is_local) {
        echo json_encode([
            'error'  => 'Server error',
            'detail' => $e->getMessage(),
            'file'   => $e->getFile(),
            'line'   => $e->getLine(),
        ], JSON_UNESCAPED_SLASHES);
    } else {
        echo json_encode(['error' => 'Server error'], JSON_UNESCAPED_SLASHES);
    }
}
