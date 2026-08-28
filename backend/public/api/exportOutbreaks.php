<?php
declare(strict_types=1);

require __DIR__ . '/../../src/db.php';

// Allow cross-origin download requests from the frontend.
header('Access-Control-Allow-Origin: *');

try {
    $pdo = db();

    // Read the outbreaks table schema so the export column order matches the DB.
    $columnsStmt = $pdo->query("SHOW COLUMNS FROM outbreaks");
    $columnRows = $columnsStmt->fetchAll(PDO::FETCH_ASSOC);
    $columns = array_column($columnRows, 'Field');

    if (!$columns) {
        throw new RuntimeException('No columns found for outbreaks table');
    }

    // Select rows in the same column order.
    $quotedColumns = array_map(
        static fn(string $col): string => '`' . str_replace('`', '``', $col) . '`',
        $columns
    );
    $sql = 'SELECT ' . implode(', ', $quotedColumns) . ' FROM outbreaks';
    $stmt = $pdo->query($sql);

    // Stream CSV as a browser download.
    $filename = 'outbreaks_export_' . date('Ymd_His') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-store, no-cache, must-revalidate');

    $out = fopen('php://output', 'w');
    fputcsv($out, $columns);

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $line = [];
        foreach ($columns as $column) {
            $line[] = $row[$column] ?? '';
        }
        fputcsv($out, $line);
    }

    fclose($out);
} catch (Throwable $e) {
    // Return a generic error response if export generation fails.
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode(['error' => 'Server error'], JSON_UNESCAPED_SLASHES);
}
