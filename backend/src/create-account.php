<?php
declare(strict_types=1);

// enable error reporting for development
error_reporting(E_ALL);
ini_set('display_errors', '0'); // don't display errors in response

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// CORS headers for React frontend
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// include database connection
require_once __DIR__ . '/db.php';

try {
    // get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
        exit();
    }

    $firstName = trim($data['firstName'] ?? '');
    $lastName = trim($data['lastName'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    // server-side validation
    $errors = [];
    if (!$firstName) $errors[] = 'First name is required';
    if (!$lastName) $errors[] = 'Last name is required';
    if (!$email) $errors[] = 'Email is required';
    elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Invalid email format';
    if (!$password) $errors[] = 'Password is required';
    elseif (strlen($password) < 8) $errors[] = 'Password must be at least 8 characters';

    if (!empty($errors)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => implode(', ', $errors)]);
        exit();
    }

    $pdo = db();

    // check for duplicate email before insert
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Email is already registered to an account. Please register with a different email address'
        ]);
        exit();
    }

    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    // attempt insert
    try {
        $stmt = $pdo->prepare('INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)');
        $stmt->execute([$firstName, $lastName, $email, $hashedPassword]);
        $newUserId = (int)$pdo->lastInsertId();
        $_SESSION['user_id'] = $newUserId;

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Account created successfully',
            'user_id' => $newUserId
        ]);

    } catch (PDOException $e) {
        // catch race condition duplicate email insert
        if ($e->getCode() === '23000') { // duplicate entry
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Email is already registered to an account. Please register with a different email address'
            ]);
        } else {
            error_log('Database error in create-account.php: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database error occurred']);
        }
    }

} catch (Exception $e) {
    error_log('Error in create-account.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'An error occurred']);
}
?>
