<?php
declare(strict_types=1);

require __DIR__ . '/../../src/db.php';
require __DIR__ . '/../../src/response.php';
require __DIR__ . '/../../src/auth.php';    // Provides login() and session_start()
require __DIR__ . '/../../src/profile.php'; // Added for ViewProfile

//start session and handle CORS
session_start();

header('Content-Type: application/json; charset=utf-8');

$allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://aptitude.cse.buffalo.edu',
    'https://cattle.cse.buffalo.edu',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$route = $_GET['r'] ?? 'tooltip';

try {
    if ($route === 'tooltip' || $route === 'message') {
        $pdo = db();
        // Retrieve ONE message (latest or first, your choice)
        $stmt = $pdo->query("SELECT message FROM demo_messages ORDER BY id DESC LIMIT 1");
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'No message found'], JSON_UNESCAPED_SLASHES);
            exit;
        }
        echo json_encode(['message' => $row['message']], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // New block added for LoginPage
    if ($route === 'login') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'POST required'], JSON_UNESCAPED_SLASHES);
            exit;
        }
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);
        $email = isset($data['email']) ? trim((string)$data['email']) : '';
        $password = isset($data['password']) ? (string)$data['password'] : '';
        if ($email === '' || $password === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Missing email/password'], JSON_UNESCAPED_SLASHES);
            exit;
        }
        $pdo = db();
        $stmt = $pdo->prepare("
            SELECT id, email, password, is_active, is_admin 
            FROM users 
            WHERE email = ? 
            LIMIT 1
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user || (int)$user['is_active'] !== 1) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Invalid credentials'], JSON_UNESCAPED_SLASHES);
            exit;
        }
        if (!password_verify($password, (string)$user['password'])) {
            http_response_code(401);
            echo json_encode(['ok' => false, 'error' => 'Invalid credentials'], JSON_UNESCAPED_SLASHES);
            exit;
        }
        // Set session
        $_SESSION['user_id'] = (int)$user['id'];
        // Return user info including admin status
        echo json_encode([
            'ok'       => true,
            'user_id'  => (int)$user['id'],
            'is_admin' => (int)$user['is_admin'] === 1
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($route === 'createAccount') {
        require __DIR__ . '/../../src/create-account.php';
        exit;
    }
    // Forgot Password: request one-time confirmation code
    if ($route === 'forgot_password_request') {
        require __DIR__ . '/forgot_password_request.php';
        exit;
    }
    // Forgot Password: reset password using confirmation code
    if ($route === 'reset_password') {
        require __DIR__ . '/reset_password.php';
        exit;
    }
    // Route for Data page weather filter
    if ($route === 'weather') {
        require __DIR__ . '/weather.php';
        exit;
    }
    // Recent Outbreaks for homepage widget WILL
    if ($route === 'create_outbreak') {
        require __DIR__ . '/create_outbreak.php';
        exit;
    }
    if ($route === 'health') {
        echo json_encode(['ok' => true, 'time' => date('c')], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($route === 'publications-list' || $route === 'publications-submit') {
            require __DIR__ . '/publications.php';
            exit;
    }

    /* -------------------------------------------------------
     * ViewProfile routes (added by soojung)
     * ------------------------------------------------------- */
    // Get profile of the logged-in user
    // GET ?r=getProfile
    if ($route === 'getProfile') {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'GET required'], JSON_UNESCAPED_SLASHES);
            exit;
        }
        get_profile();
    }
    // Update profile fields of the logged-in user
    // POST ?r=updateProfile
    if ($route === 'updateProfile') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'POST required'], JSON_UNESCAPED_SLASHES);
            exit;
        }
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        update_profile($body);
    }
    // Delete account of the logged-in user
    // POST ?r=deleteAccount
    if ($route === 'deleteAccount') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'POST required'], JSON_UNESCAPED_SLASHES);
            exit;
        }
        delete_account();
    }
    // Upload profile image for the logged-in user
    // POST ?r=uploadImage (multipart/form-data)
    if ($route === 'uploadImage') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['ok' => false, 'error' => 'POST required'], JSON_UNESCAPED_SLASHES);
            exit;
        }
        upload_profile_image();
    }
    /* ------------------------------------------------------- */

    // data page (lexi)
    //  outbreaks: summary stats
    if ($route === 'detectLocation') {
    require __DIR__ . '/../../src/location.php';
    detect_location();
    exit;
}

    if ($route === 'outbreaks-summary') {
        $pdo       = db();
        $disease   = isset($_GET['disease'])          ? trim((string)$_GET['disease'])          : '';
        $mortality = isset($_GET['mortality_status']) ? trim((string)$_GET['mortality_status']) : '';
        $validMortality = ['High', 'Moderate', 'Low'];

        if ($mortality !== '' && !in_array($mortality, $validMortality, true)) {
            echo json_encode(['totalOutbreaks' => 0], JSON_UNESCAPED_SLASHES);
            exit;
        }

        $conditions = [];
        $params     = [];
        if ($disease   !== '') { $conditions[] = 'disease = ?';          $params[] = $disease;   }
        if ($mortality !== '') { $conditions[] = 'mortality_status = ?'; $params[] = $mortality; }

        $whereBase     = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $whereRecent   = $conditions ? 'WHERE ' . implode(' AND ', array_merge($conditions, ['report_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)'])) : 'WHERE report_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        $whereResolved = $conditions ? 'WHERE ' . implode(' AND ', array_merge($conditions, ['report_date <= DATE_SUB(NOW(), INTERVAL 90 DAY)'])) : 'WHERE report_date <= DATE_SUB(NOW(), INTERVAL 90 DAY)';

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM outbreaks $whereBase");
        $stmt->execute($params); $total = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM outbreaks $whereRecent");
        $stmt->execute($params); $recentTotal = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COALESCE(SUM(cases),0) FROM outbreaks $whereBase");
        $stmt->execute($params); $totalCases = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COALESCE(SUM(cases),0) FROM outbreaks $whereRecent");
        $stmt->execute($params); $recentCases = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(DISTINCT state) FROM outbreaks $whereBase");
        $stmt->execute($params); $states = (int)$stmt->fetchColumn();

        $quarantineZones = (int)round($total       * 0.42);
        $recentZones     = (int)round($recentTotal * 0.42);

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM outbreaks $whereResolved");
        $stmt->execute($params);
        $resolved = (int)$stmt->fetchColumn();

        $animalValues = [
            'H5N1 (Avian Flu)'      => 6,
            'Swine Flu'             => 180,
            'Bovine Tuberculosis'   => 1400,
            'Mad Cow Disease (BSE)' => 1400,
            'Bluetongue'            => 175,
            'Other'                 => 6,
        ];
        $economicLoss = 0;
        $recentLoss   = 0;

        $stmt = $pdo->prepare("
            SELECT disease,
                   SUM(cases) AS total,
                   SUM(CASE WHEN report_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN cases ELSE 0 END) AS recent
            FROM outbreaks
            $whereBase
            GROUP BY disease
        ");
        $stmt->execute($params);
        $diseaseRows = $stmt->fetchAll();

        foreach ($diseaseRows as $dr) {
            $val           = $animalValues[$dr['disease']] ?? 6;
            $economicLoss += (int)$dr['total']  * $val;
            $recentLoss   += (int)$dr['recent'] * $val;
        }

        $fmt = function(int $n): string {
            if ($n >= 1000000000) return '$' . round($n / 1000000000, 1) . 'B';
            if ($n >= 1000000)    return '$' . round($n / 1000000, 1) . 'M';
            if ($n >= 1000)       return '$' . round($n / 1000, 1) . 'K';
            return '$' . $n;
        };
        $fmtNum = function(int $n): string {
            if ($n >= 1000000) return round($n / 1000000, 1) . 'M';
            if ($n >= 1000)    return round($n / 1000, 1) . 'K';
            return (string)$n;
        };

        $stmt = $pdo->prepare("SELECT MAX(created_at) FROM outbreaks $whereBase");
        $stmt->execute($params);
        $lastUpdated = $stmt->fetchColumn() ?: null;

        echo json_encode([
            'totalOutbreaks'  => $total,
            'totalDelta'      => '+' . $recentTotal . ' last 30 days',
            'affectedFarms'   => $states,
            'farmsDelta'      => $states . ' states affected',
            'livestockCases'  => $fmtNum($totalCases),
            'casesDelta'      => '+' . $fmtNum($recentCases) . ' last 30 days',
            'quarantineZones' => $quarantineZones,
            'zonesDelta'      => '+' . $recentZones . ' last 30 days',
            'resolvedCases'   => $resolved,
            'economicImpact'  => $fmt($economicLoss),
            'economicDelta'   => $fmt($recentLoss) . ' last 30 days',
            'last_updated'    => $lastUpdated,
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // outbreaks: by disease (pie chart)
    // FIXED: now accepts mortality_status filter so the pie chart updates
    if ($route === 'outbreaks-by-disease') {
        $pdo       = db();
        $mortality = isset($_GET['mortality_status']) ? trim((string)$_GET['mortality_status']) : '';
        $validMortality = ['High', 'Moderate', 'Low'];

        if ($mortality !== '' && in_array($mortality, $validMortality, true)) {
            $stmt = $pdo->prepare("
                SELECT disease, SUM(cases) AS count
                FROM outbreaks
                WHERE mortality_status = ?
                GROUP BY disease
                ORDER BY count DESC
            ");
            $stmt->execute([$mortality]);
        } else {
            $stmt = $pdo->query("
                SELECT disease, SUM(cases) AS count
                FROM outbreaks
                GROUP BY disease
                ORDER BY count DESC
            ");
        }
        echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_SLASHES);
        exit;
    }

    // outbreaks: trends over time
    // BUG THAT CAUSED BLANK CHARTS:
    // old query was: SELECT YEAR(...), MONTH(...), SUM(cases) FROM outbreaks GROUP BY YEAR(...), MONTH(...)
    // fixed query is: add `disease` to SELECT and GROUP BY so each disease gets its own row series, matching what the frontend expects.
    // FIXED: now accepts mortality_status filter so the trend lines update
    if ($route === 'outbreaks-trends') {
        $pdo       = db();
        $mortality = isset($_GET['mortality_status']) ? trim((string)$_GET['mortality_status']) : '';
        $validMortality = ['High', 'Moderate', 'Low'];
        $months = [
            1=>'Jan', 2=>'Feb', 3=>'Mar', 4=>'Apr', 5=>'May',  6=>'Jun',
            7=>'Jul', 8=>'Aug', 9=>'Sep', 10=>'Oct', 11=>'Nov', 12=>'Dec',
        ];

        if ($mortality !== '' && in_array($mortality, $validMortality, true)) {
            $stmt = $pdo->prepare("
                SELECT
                    disease,
                    YEAR(report_date)  AS year,
                    MONTH(report_date) AS month_num,
                    SUM(cases)         AS cases
                FROM outbreaks
                WHERE mortality_status = ?
                GROUP BY disease, YEAR(report_date), MONTH(report_date)
                ORDER BY disease, YEAR(report_date), MONTH(report_date)
            ");
            $stmt->execute([$mortality]);
        } else {
            $stmt = $pdo->query("
                SELECT
                    disease,
                    YEAR(report_date)  AS year,
                    MONTH(report_date) AS month_num,
                    SUM(cases)         AS cases
                FROM outbreaks
                GROUP BY disease, YEAR(report_date), MONTH(report_date)
                ORDER BY disease, YEAR(report_date), MONTH(report_date)
            ");
        }

        $rows      = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $chartData = [];
        foreach ($rows as $row) {
            $chartData[] = [
                'disease'   => $row['disease'],
                'year'      => (int)$row['year'],
                'month'     => $months[(int)$row['month_num']],
                'month_num' => (int)$row['month_num'],
                'cases'     => (int)$row['cases'],
            ];
        }
        echo json_encode($chartData, JSON_UNESCAPED_SLASHES);
        exit;
    }

    // outbreaks: by state (choropleth map)
    // FIXED: now accepts mortality_status filter so the map updates
    if ($route === 'outbreaks-by-state') {
        $pdo       = db();
        $disease   = isset($_GET['disease'])          ? trim((string)$_GET['disease'])          : '';
        $mortality = isset($_GET['mortality_status']) ? trim((string)$_GET['mortality_status']) : '';
        $validMortality = ['High', 'Moderate', 'Low'];

        $conditions = [];
        $params     = [];
        if ($disease   !== '') { $conditions[] = 'disease = ?';          $params[] = $disease;   }
        if ($mortality !== '' && in_array($mortality, $validMortality, true)) { $conditions[] = 'mortality_status = ?'; $params[] = $mortality; }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $stmt  = $pdo->prepare("
            SELECT state, COUNT(*) AS outbreaks, SUM(cases) AS total_cases
            FROM outbreaks
            $where
            GROUP BY state
            ORDER BY outbreaks DESC
        ");
        $stmt->execute($params);
        echo json_encode($stmt->fetchAll(), JSON_UNESCAPED_SLASHES);
        exit;
    }

    http_response_code(404);
    echo json_encode(['error' => 'Unknown route'], JSON_UNESCAPED_SLASHES);
}
catch (Throwable $e) {
    http_response_code(500);
    // TEMP: show the real error locally so we can debug
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