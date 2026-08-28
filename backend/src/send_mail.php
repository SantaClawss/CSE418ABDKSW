<?php
declare(strict_types=1);

/**
 * Send a password reset one-time code using PHP's built-in mail().
 *
 * NOTE:
 * - Delivery depends on the server mail configuration.
 * - This function only sends; it does NOT generate codes.
 */
function send_password_reset_code(string $email, string $code): bool
{
    $appName = 'Livestock Epidemic Tracker';
    $from = 'no-reply@buffalo.edu';

    $subject = "{$appName} - Password Reset Code";

    $message =
        "You requested a password reset.\n\n" .
        "Your one-time password reset code is:\n\n" .
        "{$code}\n\n" .
        "This code will expire in 15 minutes.\n\n" .
        "If you did not request this password reset, you may safely ignore this email.\n\n" .
        "You must wait 5 minutes after this request to send another.\n";

    $headers = [];
    $headers[] = "From: {$appName} <{$from}>";
    $headers[] = "Reply-To: {$from}";
    $headers[] = "MIME-Version: 1.0";
    $headers[] = "Content-Type: text/plain; charset=UTF-8";

    $headersString = implode("\r\n", $headers);

    // The 5th arg (-f) helps on some servers; if your host errors on it, remove the 5th parameter.
    return mail($email, $subject, $message, $headersString, "-f {$from}");
}