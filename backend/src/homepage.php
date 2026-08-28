// File: homepage.php - Sample frontend entry point (calls the API)
// This is where the homepage loads after login, fetching data via JS or directly.

<?php
require_once 'auth.php';
if (!isLoggedIn()) {
    header('Location: /login.html'); // Redirect if not logged in
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Homepage</title>
    <script>
        // Example: Fetch user info on load
        window.onload = function() {
            fetch('/api.php?action=getUserInfo')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('user-info').innerText = `Welcome, ${data.username}!`;
                });
            
            // Fetch feed
            fetch('/api.php?action=getFeed')
                .then(response => response.json())
                .then(posts => {
                    // Render posts in DOM
                    console.log(posts);
                });
        };
    </script>
</head>
<body>
    <h1 id="user-info">Loading...</h1>
    <!-- Feed content here -->
</body>
</html>