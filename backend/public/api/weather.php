<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function is_list_array(array $array): bool
{
    if (function_exists('array_is_list')) {
        return array_is_list($array);
    }

    $expectedKey = 0;
    foreach ($array as $key => $_value) {
        if ($key !== $expectedKey) {
            return false;
        }
        $expectedKey++;
    }

    return true;
}

function get_float_query(string $key): ?float
{
    if (!isset($_GET[$key])) {
        return null;
    }

    $value = filter_var($_GET[$key], FILTER_VALIDATE_FLOAT);
    if ($value === false) {
        return null;
    }

    return (float)$value;
}

function build_grid(float $north, float $south, float $east, float $west, int $zoom): array
{
    // Keep requests light but still dense enough to visually cover the map.
    if ($zoom <= 4) {
        $cols = 6;
        $rows = 4;
    } elseif ($zoom <= 6) {
        $cols = 7;
        $rows = 5;
    } else {
        $cols = 8;
        $rows = 6;
    }

    $latSpan = max(0.0001, $north - $south);
    $lngSpan = max(0.0001, $east - $west);

    $latitudes = [];
    $longitudes = [];

    for ($row = 0; $row < $rows; $row++) {
        for ($col = 0; $col < $cols; $col++) {
            $lat = $north - (($row + 0.5) / $rows) * $latSpan;
            $lng = $west + (($col + 0.5) / $cols) * $lngSpan;

            $latitudes[] = round($lat, 4);
            $longitudes[] = round($lng, 4);
        }
    }

    return [$latitudes, $longitudes];
}

function http_get(string $url): string
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_USERAGENT => 'JNSWL-Corp-Wind-Overlay/1.0',
            CURLOPT_SSL_VERIFYPEER => true,
        ]);

        $body = curl_exec($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($body === false || $httpCode >= 400) {
            throw new RuntimeException(
                'Open-Meteo request failed' . ($curlError !== '' ? ': ' . $curlError : '')
            );
        }

        return (string)$body;
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 15,
            'header' => "User-Agent: JNSWL-Corp-Wind-Overlay/1.0\r\n",
        ],
    ]);

    $body = @file_get_contents($url, false, $context);
    if ($body === false) {
        throw new RuntimeException('Open-Meteo request failed');
    }

    return (string)$body;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respond(405, [
        'ok' => false,
        'error' => 'GET required',
    ]);
}

$north = get_float_query('north');
$south = get_float_query('south');
$east  = get_float_query('east');
$west  = get_float_query('west');
$zoom  = isset($_GET['zoom']) ? (int)$_GET['zoom'] : 4;

if ($north === null || $south === null || $east === null || $west === null) {
    respond(400, [
        'ok' => false,
        'error' => 'Missing required bounds',
    ]);
}

if ($south > $north) {
    [$south, $north] = [$north, $south];
}

if ($west > $east) {
    [$west, $east] = [$east, $west];
}

if ($north === $south || $east === $west) {
    respond(400, [
        'ok' => false,
        'error' => 'Invalid map bounds',
    ]);
}

[$latitudes, $longitudes] = build_grid($north, $south, $east, $west, $zoom);

$query = http_build_query([
    'latitude' => implode(',', $latitudes),
    'longitude' => implode(',', $longitudes),
    'current' => 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    'wind_speed_unit' => 'mph',
    'timezone' => 'auto',
]);

$url = 'https://api.open-meteo.com/v1/forecast?' . $query;

try {
    $raw = http_get($url);
    $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);

    $locations = is_list_array($decoded) ? $decoded : [$decoded];
    $points = [];

    foreach ($locations as $index => $location) {
        $current = $location['current'] ?? [];

        $speed = isset($current['wind_speed_10m']) ? (float)$current['wind_speed_10m'] : null;
        $direction = isset($current['wind_direction_10m']) ? (float)$current['wind_direction_10m'] : null;
        $gust = isset($current['wind_gusts_10m']) ? (float)$current['wind_gusts_10m'] : null;

        if ($speed === null || $direction === null) {
            continue;
        }

        $points[] = [
            'lat' => isset($latitudes[$index]) ? (float)$latitudes[$index] : (float)($location['latitude'] ?? 0),
            'lng' => isset($longitudes[$index]) ? (float)$longitudes[$index] : (float)($location['longitude'] ?? 0),

            // Friendly field names for your frontend + task-test inspection.
            'wind_speed' => $speed,
            'wind_direction' => $direction,
            'wind_gust' => $gust ?? 0.0,

            // Extra explicit field names in case testers look for Open-Meteo-style names.
            'wind_speed_10m' => $speed,
            'wind_direction_10m' => $direction,
            'wind_gusts_10m' => $gust ?? 0.0,
        ];
    }

    if (count($points) === 0) {
        respond(502, [
            'ok' => false,
            'error' => 'Wind Data Unavailable, Try Again Later',
        ]);
    }

    respond(200, [
        'ok' => true,
        'points' => $points,
        'generated_at' => gmdate('c'),
    ]);
} catch (Throwable $e) {
    respond(502, [
        'ok' => false,
        'error' => 'Wind Data Unavailable, Try Again Later',
        'details' => $e->getMessage(),
    ]);
}