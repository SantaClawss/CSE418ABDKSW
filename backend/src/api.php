// File: api.php - API endpoints for homepage backend calls
// This could be called via AJAX from the frontend homepage.
// Assume homepage needs: user info, perhaps a feed of posts, notifications, etc.
// We'll add skeleton for user info and a sample "getFeed" (assuming a posts table).

// First, add a sample posts table for demo:
// CREATE TABLE posts (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     user_id INT NOT NULL,
//     content TEXT NOT NULL,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

<?php
header('Content-Type: application/json');
session_start();
require_once 'config.php';
require_once 'user.php';
require_once 'auth.php';

if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'getUserInfo':
        $userId = $_SESSION['user_id'];
        $user = User::getById($userId);
        if ($user) {
            echo json_encode($user);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
        }
        break;

    case 'getFeed': // Example: Retrieve recent posts for homepage feed
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT p.id, p.content, p.created_at, u.username 
                               FROM posts p JOIN users u ON p.user_id = u.id 
                               ORDER BY p.created_at DESC LIMIT 10");
        $stmt->execute();
        $posts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($posts);
        break;

    // Add more endpoints as needed, e.g., 'getNotifications', 'getFriendsList', etc.
    // case 'getNotifications':
    //     // Skeleton: Fetch from a notifications table
    //     break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
}
?>