<?php
declare(strict_types=1);

session_start();

require_once 'config.php';
require_once 'user.php';

/* ==============================
   SECURITY HEADERS
============================== */
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Content-Security-Policy: default-src 'self'");

/* ==============================
   LOGIN FUNCTION
============================== */
function login(string $email, string $password): bool {
    $pdo = getDBConnection();

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $stmt = $pdo->prepare("SELECT id, password FROM users WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && password_verify($password, $user['password'])) {

        // Prevent session fixation
        session_regenerate_id(true);

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['last_regeneration'] = time();

        return true;
    }

    return false;
}

/* ==============================
   SESSION CHECK
============================== */
function isLoggedIn(): bool {
    return isset($_SESSION['user_id']);
}

/* ==============================
   LOGOUT FUNCTION
============================== */
function logout(): void {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
}

/* ==============================
   LOGIN ENDPOINT HANDLER
============================== */
if ($_SERVER['REQUEST_METHOD'] === 'POST'
    && isset($_POST['action'])
    && $_POST['action'] === 'login') {

    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (login($email, $password)) {
        header('Location: /homepage.php');
        exit;
    } else {
        echo htmlspecialchars("Login failed", ENT_QUOTES, 'UTF-8');
    }
}