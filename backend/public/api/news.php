<?php
declare(strict_types=1);

$newsapi = "79e33720c17ae79d05507f0ae1543cc4";

require_once __DIR__ . '/../../src/response.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    json_response(['ok' => false, 'error' => 'GET required'], 405);
}

$query = 'agriculture OR farming OR livestock OR poultry';

// Keep the API key on the server; never include this URL in the JSON response.
$apiUrl = 'https://gnews.io/api/v4/search?' . http_build_query([
    'q' => $query, 'lang' => 'en', 'max' => 10,
    'sortby' => 'publishedAt', 'nullable' => 'description,image',
    'apikey' => $newsapi,
], '', '&', PHP_QUERY_RFC3986);

try {
    if (function_exists('curl_init')) {
        $handle = curl_init($apiUrl);
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_USERAGENT => 'AgriculturalNews/1.0',
        ]);
        $raw = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
        curl_close($handle);
        if ($raw === false || $status !== 200) {
            throw new RuntimeException('GNews request failed');
        }
    } else {
        $context = stream_context_create(['http' => [
            'timeout' => 15, 'follow_location' => 0, 'ignore_errors' => true,
            'header' => "User-Agent: AgriculturalNews/1.0\r\n",
        ]]);
        $raw = @file_get_contents($apiUrl, false, $context);
        $status = isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $match) ? (int) $match[1] : 0;
        if ($raw === false || $status !== 200) {
            throw new RuntimeException('GNews request failed');
        }
    }
    $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($data) || !isset($data['articles']) || !is_array($data['articles'])) {
        throw new RuntimeException('Invalid GNews response');
    }
    $articles = [];
    $seen = [];
    foreach ($data['articles'] as $item) {
        $link = trim((string) ($item['url'] ?? ''));
        $title = trim((string) ($item['title'] ?? ''));
        if ($title === '' || !filter_var($link, FILTER_VALIDATE_URL) ||
            !in_array(strtolower((string) parse_url($link, PHP_URL_SCHEME)), ['http', 'https'], true) || isset($seen[$link])) {
            continue;
        }
        $seen[$link] = true;
        $date = strtotime((string) ($item['publishedAt'] ?? ''));
        $articles[] = [
            'id' => hash('sha256', $link),
            'title' => $title,
            'source' => trim((string) ($item['source']['name'] ?? '')) ?: 'GNews',
            'sourceUrl' => $link,
            'date' => $date === false ? null : gmdate('c', $date),
            'description' => trim(html_entity_decode(strip_tags((string) ($item['description'] ?? '')), ENT_QUOTES | ENT_HTML5, 'UTF-8')),
        ];
        if (count($articles) >= 10) {
            break;
        }
    }
    header('Cache-Control: public, max-age=300');
    json_response(['ok' => true, 'articles' => $articles]);
} catch (Throwable $error) {
    // Log no upstream URL or response body, which could contain credentials.
    error_log('GNews request failed; HTTP status: ' . ($status ?? 0));
    json_response(['ok' => false, 'error' => 'News is temporarily unavailable. Please try again.'], 502);
}
