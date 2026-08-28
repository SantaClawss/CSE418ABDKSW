<?php
session_start();
require_once '../../src/user.php';
require_once '../../src/response.php';

if (!isset($_SESSION['user_id'])) {
    json_response(['ok' => false, 'error' => 'Not logged in'], 401);
}

$body = json_decode(file_get_contents('php://input'), true);

if (!$body) {
    json_response(['ok' => false, 'error' => 'Invalid request body'], 400);
}

$result = User::updateProfile((int)$_SESSION['user_id'], $body);

if (!$result['ok']) {
    json_response(['ok' => false, 'error' => $result['error']], 400);
}

json_response(['ok' => true, 'message' => 'Profile updated'], 200);