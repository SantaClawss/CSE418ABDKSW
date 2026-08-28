<?php
// src/profile.php
require_once __DIR__ . '/response.php';

// Get profile of the currently logged-in user
function get_profile(): void {
    if (!isset($_SESSION['user_id'])) {
        json_response(['ok' => false, 'error' => 'Not logged in'], 401);
    }

    $pdo  = db();
    try {
        $stmt = $pdo->prepare(
            "SELECT id,
                    first_name AS firstName, last_name AS lastName,
                    state, city, address, zip, email, phone,
                    profile_image AS profileImg
             FROM users WHERE id = ?"
        );
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        // Fallback for environments where optional profile columns are missing.
        $stmt = $pdo->prepare(
            "SELECT id,
                    first_name AS firstName, last_name AS lastName,
                    email
             FROM users WHERE id = ?"
        );
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$user) {
        json_response(['ok' => false, 'error' => 'User not found'], 404);
    }

    $user['state'] = (string)($user['state'] ?? '');
    $user['city'] = (string)($user['city'] ?? '');
    $user['address'] = (string)($user['address'] ?? '');
    $user['zip'] = (string)($user['zip'] ?? '');
    $user['phone'] = (string)($user['phone'] ?? '');
    $user['profileImg'] = (string)($user['profileImg'] ?? '');

    // Keep response shape stable for frontend even when users.username is not present.
    $user['username'] = trim(((string)($user['firstName'] ?? '')) . ' ' . ((string)($user['lastName'] ?? '')));

    json_response(array_merge(['ok' => true], $user), 200);
}

// Update profile fields for the currently logged-in user
function update_profile(array $body): void {
    if (!isset($_SESSION['user_id'])) {
        json_response(['ok' => false, 'error' => 'Not logged in'], 401);
    }

    $allowedFields = ['first_name', 'last_name', 'state', 'city', 'address', 'zip', 'email', 'phone'];
    $updates = [];
    $values  = [];

    foreach ($allowedFields as $field) {
        if (isset($body[$field])) {
            $updates[] = "$field = ?";
            $values[]  = htmlspecialchars(strip_tags((string)$body[$field]));
        }
    }

    if (empty($updates)) {
        json_response(['ok' => false, 'error' => 'No fields to update'], 400);
    }

    $values[] = $_SESSION['user_id'];
    $pdo = db();
    $pdo->prepare("UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?")
        ->execute($values);

    json_response(['ok' => true, 'message' => 'Profile updated'], 200);
}

// Upload and save profile image (base64) for the currently logged-in user
function upload_profile_image(): void {
    if (!isset($_SESSION['user_id'])) {
        json_response(['ok' => false, 'error' => 'Not logged in'], 401);
    }

    $body = json_decode(file_get_contents('php://input'), true);
    if (empty($body['image'])) {
        json_response(['ok' => false, 'error' => 'No image data provided'], 400);
    }

    $base64 = $body['image'];

    if (!preg_match('/^data:image\/(jpeg|png|gif|webp);base64,/', $base64)) {
        json_response(['ok' => false, 'error' => 'Invalid image format'], 400);
    }

    // ~2MB image becomes ~2.7MB base64 string
    if (strlen($base64) > 3 * 1024 * 1024) {
        json_response(['ok' => false, 'error' => 'Image too large (max 2MB)'], 400);
    }

    $pdo = db();
    $pdo->prepare("UPDATE users SET profile_image = ? WHERE id = ?")
        ->execute([$base64, $_SESSION['user_id']]);

    json_response(['ok' => true, 'image_url' => $base64], 200);
}

// Delete the currently logged-in user's account and log out
function delete_account(): void {
    if (!isset($_SESSION['user_id'])) {
        json_response(['ok' => false, 'error' => 'Not logged in'], 401);
    }

    $pdo = db();
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);

    session_destroy();

    json_response(['ok' => true, 'message' => 'Account deleted'], 200);
}
?>
