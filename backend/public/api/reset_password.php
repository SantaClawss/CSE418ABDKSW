<?php
declare(strict_types=1);

require __DIR__ . '/../../src/db.php';
require __DIR__ . '/../../src/response.php';

/**
 * POST JSON: { "email": "...", "code": "123456", "password": "newPass123" }
 *
 * Returns ok:true only if code is valid & not expired.
 * Does NOT log the user in; frontend should force return to login.
 */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'POST required'], 405);
}

$raw = file_get_contents('php://input');
$data = json_decode($raw ?: '', true);

// Normalize email
$email = strtolower(trim((string)($data['email'] ?? '')));
$code  = trim((string)($data['code'] ?? ''));
$new_password = (string)($data['password'] ?? '');

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $code === '' || $new_password === '') {
    json_response(['ok' => false, 'error' => 'Missing or invalid fields'], 400);
}

// Enforce UB email only (required)
if (!preg_match('/@buffalo\.edu$/', $email)) {
    json_response(['ok' => false, 'error' => 'A @buffalo.edu email address is required.'], 400);
}

// Basic password rules (adjust as needed)
if (strlen($new_password) < 8) {
    json_response(['ok' => false, 'error' => 'Password must be at least 8 characters'], 400);
}

$pdo = db();

// Look up user id
$stmt = $pdo->prepare("SELECT id, is_active FROM users WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || (int)$user['is_active'] !== 1) {
    json_response(['ok' => false, 'error' => 'Invalid confirmation code or expired'], 401);
}

$user_id = (int)$user['id'];

// Fetch latest unused reset request that hasn't expired
$sel = $pdo->prepare("
    SELECT id, code_hash, expires_at
    FROM password_resets
    WHERE user_id = ?
      AND used_at IS NULL
      AND expires_at >= NOW()
    ORDER BY id DESC
    LIMIT 1
");
$sel->execute([$user_id]);
$reset = $sel->fetch();

if (!$reset) {
    json_response(['ok' => false, 'error' => 'Invalid confirmation code or expired'], 401);
}

if (!password_verify($code, (string)$reset['code_hash'])) {
    json_response(['ok' => false, 'error' => 'Invalid confirmation code or expired'], 401);
}

// Update password + mark code used
$hashed = password_hash($new_password, PASSWORD_DEFAULT);

$pdo->beginTransaction();
try {
    $up = $pdo->prepare("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ? LIMIT 1");
    $up->execute([$hashed, $user_id]);

    $mark = $pdo->prepare("UPDATE password_resets SET used_at = NOW() WHERE id = ? LIMIT 1");
    $mark->execute([(int)$reset['id']]);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

json_response(['ok' => true, 'message' => 'Password reset successful. Please log in.'], 200);