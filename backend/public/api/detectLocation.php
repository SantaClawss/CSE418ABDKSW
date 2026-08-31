<?php
// backend/public/api/detectlocation.php
session_start();
require_once '../../src/location.php';
require_once '../../src/response.php';

if (!isset($_SESSION['user_id'])) {
    json_response(['ok' => false, 'error' => 'Not logged in'], 401);
    exit;
}

detect_location();
?>