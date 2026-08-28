<?php
require_once 'config.php';

class User {
    // Fetch full profile info for frontend safely
    public static function getProfileById(int $id): ?array {
        $pdo = db(); // Use your db() function
        $stmt = $pdo->prepare("
            SELECT
                id,
                first_name AS firstName,
                last_name AS lastName,
                state,
                city,
                address,
                zip,
                email,
                phone,
                profile_image AS profileImg
            FROM users
            WHERE id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) return null;

        // Keep backward compatibility for consumers expecting a username field.
        $user['username'] = trim(((string)($user['firstName'] ?? '')) . ' ' . ((string)($user['lastName'] ?? '')));

        // Sanitize all string fields to prevent HTML injection
        foreach ($user as $key => $value) {
            if (is_string($value)) {
                $user[$key] = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
            }
        }

        return $user;
    }

    // Example: Hash password for registration
    public static function register(string $username, string $email, string $password): int {
        $pdo = db(); // Use your db() function
        $hashed = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("
            INSERT INTO users (username, email, password)
            VALUES (:username, :email, :hashed)
        ");
        $stmt->execute([
            'username' => $username,
            'email' => $email,
            'hashed' => $hashed
        ]);
        return (int)$pdo->lastInsertId();
    }
    // Update profile fields for the currently logged-in user
    public static function updateProfile(int $id, array $body): array {
        $allowedFields = ['first_name', 'last_name', 'state', 'city', 'address', 'zip', 'email', 'phone'];
        $updates = [];
        $values  = [];

        // Email validation
        if (isset($body['email'])) {
            $email = trim((string)$body['email']);
            if ($email === '') {
                return ['ok' => false, 'error' => 'Email cannot be empty'];
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return ['ok' => false, 'error' => 'Invalid email format'];
            }
            // Check if email is already used by another user
            $pdo = db();
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1");
            $stmt->execute([$email, $id]);
            if ($stmt->fetch()) {
                return ['ok' => false, 'error' => 'Email is already in use by another account'];
            }
        }

        foreach ($allowedFields as $field) {
            if (isset($body[$field])) {
                $updates[] = "$field = ?";
                $values[]  = htmlspecialchars(strip_tags((string)$body[$field]), ENT_QUOTES, 'UTF-8');
            }
        }

        if (empty($updates)) return ['ok' => false, 'error' => 'No fields to update'];

        $values[] = $id;
        db()->prepare("UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?")
           ->execute($values);

        return ['ok' => true];
    }
}
?>
