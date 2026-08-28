<?php
session_start();
require_once '../../src/user.php';
require_once '../../src/response.php';

if (!isset($_SESSION['user_id'])) {
    json_response(['ok' => false, 'error' => 'Not logged in'], 401);
}

$user = User::getProfileById((int)$_SESSION['user_id']);
if (!$user) {
    json_response(['ok' => false, 'error' => 'User not found'], 404);
}

json_response(array_merge(['ok' => true], $user), 200);