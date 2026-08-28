<?php
declare(strict_types=1);
//error code 201 = too many requests
require __DIR__ . '/../../src/db.php';
require __DIR__ . '/../../src/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'POST required'], 405);
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);

// Normalize email
$email = strtolower(trim((string)($data['email'] ?? '')));

// If empty/invalid email: keep generic response to avoid account enumeration
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_response([
        'ok' => true,
        'message' => 'If an account exists for that email, a confirmation code has been sent.'
    ], 200);
}

// Enforce UB email only (required)
if (!preg_match('/@buffalo\.edu$/', $email)) {
    json_response([
        'ok' => false,
        'error' => 'A @buffalo.edu email address is required.'
    ], 400);
}

$pdo = db();

$stmt = $pdo->prepare("SELECT id, email, is_active FROM users WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user && (int)$user['is_active'] === 1) {
    $user_id = (int)$user['id'];

    // ==============================
    // 5 MINUTE RATE LIMIT CHECK
    // ==============================
    $rate = $pdo->prepare("
        SELECT created_at
        FROM password_resets
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 1
    ");
    $rate->execute([$user_id]);
    $last = $rate->fetch(PDO::FETCH_ASSOC);

    if ($last) {
        $lastTime = new DateTimeImmutable($last['created_at']);
        $now = new DateTimeImmutable();

        $diffSeconds = $now->getTimestamp() - $lastTime->getTimestamp();
        if ($diffSeconds < 300) {
            json_response([
                'ok' => false,
                'error' => 'There was an issue try again later'
            ], 201);
        }
    }

    // ==============================
    // CREATE RESET CODE
    // ==============================

    // Hardcoded code ONLY for this test email
    if ($email === 'passtest@buffalo.edu') {
        $code = "123456";
    } else {
        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    $code_hash = password_hash($code, PASSWORD_DEFAULT);
    $expires_at = (new DateTimeImmutable('+15 minutes'))->format('Y-m-d H:i:s');

    $ins = $pdo->prepare("
        INSERT INTO password_resets (user_id, code_hash, expires_at, used_at, created_at)
        VALUES (?, ?, ?, NULL, NOW())
    ");
    $ins->execute([$user_id, $code_hash, $expires_at]);

    // Send email for real users only (skip passtest so your deterministic demo always works)
    if ($email !== 'passtest@buffalo.edu') {
        require_once __DIR__ . '/../../src/send_mail.php';
        try {
            send_password_reset_code((string)$user['email'], $code);
        } catch (Throwable $e) {
            error_log('Password reset email failed: ' . $e->getMessage());
        }
    }
}

json_response([
    'ok' => true,
    'message' => 'If an account exists for that email, a confirmation code has been sent.'
], 200);