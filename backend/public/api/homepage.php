<?php
declare(strict_types=1);

require __DIR__ . '/../../src/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$route = $_GET['r'] ?? '';

try {

    // outbreaks by state with disease_type filter
    if ($route === 'homepage-by-state') {
        $pdo          = db();
        $disease      = isset($_GET['disease'])      ? trim((string)$_GET['disease'])      : '';
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

        $stmt = $pdo->prepare("
            SELECT state, COUNT(*) AS outbreaks, SUM(cases) AS total_cases
            FROM outbreaks $whereSQL
            GROUP BY state ORDER BY outbreaks DESC
        ");
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_SLASHES);
        exit;
    }

    // diseases list for dropdown
    if ($route === 'homepage-diseases') {
        $pdo          = db();
        $disease_type = isset($_GET['disease_type']) ? trim((string)$_GET['disease_type']) : '';

        if ($disease_type !== '') {
            $stmt = $pdo->prepare("
                SELECT DISTINCT disease FROM outbreaks 
                WHERE disease_type = ? ORDER BY disease
            ");
            $stmt->execute([$disease_type]);
        } else {
            $stmt = $pdo->query("SELECT DISTINCT disease FROM outbreaks ORDER BY disease");
        }
        echo json_encode($stmt->fetchAll(PDO::FETCH_COLUMN), JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(404);
    echo json_encode(['error' => 'Unknown route'], JSON_UNESCAPED_SLASHES);

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