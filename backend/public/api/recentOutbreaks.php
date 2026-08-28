<?php
declare(strict_types=1);

// Returns the most recent approved outbreaks per disease (up to 5 each).
// Each row is an individual record used by the homepage disease-section cards.

require __DIR__ . '/../../src/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $pdo = db();

    $stmt = $pdo->query("
        SELECT id, disease, state, county, cases, report_date, created_at, status, mortality_status
        FROM (
            SELECT
                id, disease, state, county, cases, report_date, created_at, status, mortality_status,
                ROW_NUMBER() OVER (PARTITION BY disease ORDER BY report_date DESC, id DESC) AS rn
            FROM outbreaks
            WHERE status = 'approved'
        ) ranked
        WHERE rn <= 5
        ORDER BY disease ASC, report_date DESC, id DESC
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$row) {
        $row['id']    = (int)$row['id'];
        $row['cases'] = (int)$row['cases'];
    }
    unset($row);

    echo json_encode($rows, JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error'], JSON_UNESCAPED_SLASHES);
}
