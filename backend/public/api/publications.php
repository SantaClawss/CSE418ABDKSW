<?php
declare(strict_types=1);

require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/auth.php';

const PUBLICATIONS_CACHE_TTL_SECONDS = 1800; // 30 minutes
const PUBLICATIONS_SYNC_PROVIDER = 'OpenAlex';

function publications_json(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function publications_config(): array {
    return require __DIR__ . '/../../src/config.php';
}

function publications_openalex_queries(): array {
    return [
        'avian influenza poultry livestock outbreak surveillance',
        'african swine fever swine livestock outbreak surveillance',
        'foot and mouth disease cattle livestock outbreak surveillance',
        'bovine tuberculosis cattle livestock outbreak surveillance',
        'bluetongue sheep cattle livestock outbreak surveillance',
        'brucellosis cattle goat sheep livestock outbreak surveillance',
        'livestock epidemic disease surveillance cattle swine poultry'
    ];
}

function publications_livestock_terms(): array {
    return [
        'livestock', 'cattle', 'bovine', 'cow', 'dairy', 'swine', 'pig', 'porcine',
        'poultry', 'avian', 'chicken', 'broiler', 'turkey', 'sheep', 'ovine',
        'goat', 'caprine', 'herd', 'flock'
    ];
}

function publications_disease_terms(): array {
    return [
        'outbreak', 'epidemic', 'epizootic', 'surveillance', 'transmission',
        'avian influenza', 'h5n1', 'african swine fever', 'foot and mouth',
        'foot-and-mouth', 'bovine tuberculosis', 'brucellosis', 'bluetongue',
        'disease', 'pathogen', 'infection'
    ];
}

function publications_join_authors(array $authorships): string {
    $names = [];
    foreach ($authorships as $author) {
        $name = trim((string)($author['author']['display_name'] ?? ''));
        if ($name !== '') {
            $names[] = $name;
        }
    }
    return implode(', ', $names);
}

function publications_extract_journal(array $work): string {
    return trim((string)($work['primary_location']['source']['display_name'] ?? ''));
}

function publications_extract_origin_url(array $work): string {
    $landing = trim((string)($work['primary_location']['landing_page_url'] ?? ''));
    if ($landing !== '') return $landing;

    $doi = trim((string)($work['doi'] ?? ''));
    if ($doi !== '') return $doi;

    return trim((string)($work['id'] ?? ''));
}

function publications_rebuild_abstract($invertedIndex): string {
    if (!is_array($invertedIndex) || empty($invertedIndex)) {
        return '';
    }

    $positionToWord = [];
    foreach ($invertedIndex as $word => $positions) {
        if (!is_array($positions)) continue;
        foreach ($positions as $pos) {
            $positionToWord[(int)$pos] = $word;
        }
    }

    if (empty($positionToWord)) return '';

    ksort($positionToWord);
    return trim(implode(' ', $positionToWord));
}

function publications_is_relevant(string $text): bool {
    $text = strtolower($text);

    $hasLivestock = false;
    foreach (publications_livestock_terms() as $term) {
        if (str_contains($text, strtolower($term))) {
            $hasLivestock = true;
            break;
        }
    }

    if (!$hasLivestock) return false;

    foreach (publications_disease_terms() as $term) {
        if (str_contains($text, strtolower($term))) {
            return true;
        }
    }

    return false;
}

function publications_http_get_json(string $url): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'User-Agent: LivestockEpidemicTracker/1.0'
        ],
    ]);

    $body = curl_exec($ch);
    $errno = curl_errno($ch);
    $error = curl_error($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($errno !== 0) {
        throw new RuntimeException('cURL error: ' . $error);
    }

    if ($status < 200 || $status >= 300) {
        throw new RuntimeException('HTTP status ' . $status);
    }

    $decoded = json_decode((string)$body, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('Invalid JSON response');
    }

    return $decoded;
}

function publications_log_sync(PDO $pdo, string $status, string $message): void {
    $stmt = $pdo->prepare("
        INSERT INTO publication_sync_status (provider, status, message)
        VALUES (?, ?, ?)
    ");
    $stmt->execute([PUBLICATIONS_SYNC_PROVIDER, $status, mb_substr($message, 0, 500)]);
}

function publications_build_openalex_url(string $query): string {
    $cfg = publications_config();

    $params = [
        'search' => $query,
        'per_page' => 25,
        'page' => 1,
        'select' => 'id,display_name,publication_year,publication_date,doi,type,authorships,primary_location,abstract_inverted_index',
        'mailto' => $cfg['openalex_mailto'] ?? '',
    ];

    if (!empty($cfg['openalex_api_key'])) {
        $params['api_key'] = $cfg['openalex_api_key'];
    }

    return 'https://api.openalex.org/works?' . http_build_query($params);
}

function publications_upsert_api_record(PDO $pdo, array $row): void {
    $stmt = $pdo->prepare("
        INSERT INTO api_publications_cache (
            external_id, source_name, title, authors, journal,
            publication_year, publication_date, doi, origin_url,
            abstract_text, publication_type, raw_json, cached_at
        ) VALUES (
            :external_id, :source_name, :title, :authors, :journal,
            :publication_year, :publication_date, :doi, :origin_url,
            :abstract_text, :publication_type, :raw_json, NOW()
        )
        ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            authors = VALUES(authors),
            journal = VALUES(journal),
            publication_year = VALUES(publication_year),
            publication_date = VALUES(publication_date),
            doi = VALUES(doi),
            origin_url = VALUES(origin_url),
            abstract_text = VALUES(abstract_text),
            publication_type = VALUES(publication_type),
            raw_json = VALUES(raw_json),
            cached_at = NOW()
    ");

    $stmt->execute($row);
}

function publications_sync_openalex(PDO $pdo): array {
    $saved = 0;
    $seen = [];

    foreach (publications_openalex_queries() as $query) {
        $url = publications_build_openalex_url($query);
        $response = publications_http_get_json($url);
        $results = $response['results'] ?? [];

        if (!is_array($results)) {
            continue;
        }

        foreach ($results as $work) {
            $externalId = trim((string)($work['id'] ?? ''));
            if ($externalId === '' || isset($seen[$externalId])) {
                continue;
            }

            $title = trim((string)($work['display_name'] ?? ''));
            $authors = publications_join_authors($work['authorships'] ?? []);
            $journal = publications_extract_journal($work);
            $abstract = publications_rebuild_abstract($work['abstract_inverted_index'] ?? null);
            $combinedText = trim($title . ' ' . $journal . ' ' . $abstract);

            if (!publications_is_relevant($combinedText)) {
                continue;
            }

            $seen[$externalId] = true;

            publications_upsert_api_record($pdo, [
                'external_id' => $externalId,
                'source_name' => 'OpenAlex',
                'title' => $title !== '' ? $title : 'Untitled publication',
                'authors' => $authors,
                'journal' => $journal,
                'publication_year' => !empty($work['publication_year']) ? (int)$work['publication_year'] : null,
                'publication_date' => !empty($work['publication_date']) ? $work['publication_date'] : null,
                'doi' => trim((string)($work['doi'] ?? '')),
                'origin_url' => publications_extract_origin_url($work),
                'abstract_text' => $abstract,
                'publication_type' => trim((string)($work['type'] ?? '')),
                'raw_json' => json_encode($work, JSON_UNESCAPED_SLASHES),
            ]);

            $saved++;
        }
    }

    $message = "OpenAlex sync completed. Saved/updated {$saved} relevant publications.";
    publications_log_sync($pdo, 'up', $message);

    return [
        'ok' => true,
        'status' => 'up',
        'message' => $message
    ];
}

function publications_get_last_cache_time(PDO $pdo): ?int {
    $stmt = $pdo->query("SELECT MAX(cached_at) AS latest FROM api_publications_cache");
    $row = $stmt->fetch();
    if (!$row || empty($row['latest'])) return null;
    $ts = strtotime((string)$row['latest']);
    return $ts !== false ? $ts : null;
}

function publications_get_last_sync_status(PDO $pdo): array {
    $stmt = $pdo->prepare("
        SELECT status, message, ran_at
        FROM publication_sync_status
        WHERE provider = ?
        ORDER BY ran_at DESC, id DESC
        LIMIT 1
    ");
    $stmt->execute([PUBLICATIONS_SYNC_PROVIDER]);
    $row = $stmt->fetch();

    if (!$row) {
        return [
            'status' => 'unknown',
            'message' => 'No sync has run yet.',
            'ran_at' => null
        ];
    }

    return [
        'status' => (string)$row['status'],
        'message' => (string)$row['message'],
        'ran_at' => (string)$row['ran_at']
    ];
}

function publications_ensure_cache(PDO $pdo): array {
    $lastCache = publications_get_last_cache_time($pdo);
    $isStale = !$lastCache || (time() - $lastCache) > PUBLICATIONS_CACHE_TTL_SECONDS;

    if (!$isStale) {
        return publications_get_last_sync_status($pdo);
    }

    try {
        $sync = publications_sync_openalex($pdo);
        return [
            'status' => $sync['status'],
            'message' => $sync['message'],
            'ran_at' => date('Y-m-d H:i:s')
        ];
    } catch (Throwable $e) {
        $message = 'OpenAlex sync failed. Serving cached publications instead. ' . $e->getMessage();
        publications_log_sync($pdo, 'down', $message);

        return [
            'status' => 'down',
            'message' => $message,
            'ran_at' => date('Y-m-d H:i:s')
        ];
    }
}

function publications_fetch_api_rows(PDO $pdo, string $search): array {
    $sql = "
        SELECT
            id,
            title,
            authors,
            journal,
            publication_year,
            publication_date,
            doi,
            origin_url,
            abstract_text,
            publication_type,
            source_name,
            cached_at
        FROM api_publications_cache
    ";

    $params = [];
    if ($search !== '') {
        $sql .= "
            WHERE
                title LIKE ?
                OR authors LIKE ?
                OR journal LIKE ?
                OR abstract_text LIKE ?
                OR doi LIKE ?
        ";
        $like = '%' . $search . '%';
        $params = [$like, $like, $like, $like, $like];
    }

    $sql .= " ORDER BY COALESCE(publication_date, CONCAT(publication_year, '-01-01')) DESC, id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $rows = $stmt->fetchAll() ?: [];
    foreach ($rows as &$row) {
        $row['bucket'] = 'api';
        $row['display_source'] = 'OpenAlex';
        $row['submitted_by_me'] = false;
    }
    return $rows;
}

function publications_fetch_user_rows(PDO $pdo, string $search, string $sourceMode): array {
    $mineOnly = ($sourceMode === 'mine');

    if ($mineOnly && !isLoggedIn()) {
        return [];
    }

    $sql = "
        SELECT
            up.id,
            up.user_id,
            up.title,
            up.authors,
            up.journal,
            up.publication_year,
            up.publication_date,
            up.doi,
            up.origin_url,
            up.abstract_text,
            up.publication_type,
            up.approval_status,
            up.created_at,
            u.first_name,
            u.last_name
        FROM user_publications up
        LEFT JOIN users u ON u.id = up.user_id
    ";

    $clauses = [];
    $params = [];

    if ($mineOnly) {
        $clauses[] = "up.user_id = ?";
        $params[] = (int)$_SESSION['user_id'];
    } else {
        $clauses[] = "up.approval_status = 'approved'";
    }

    if ($search !== '') {
        $clauses[] = "(
            up.title LIKE ?
            OR up.authors LIKE ?
            OR up.journal LIKE ?
            OR up.abstract_text LIKE ?
            OR up.doi LIKE ?
        )";
        $like = '%' . $search . '%';
        array_push($params, $like, $like, $like, $like, $like);
    }

    if (!empty($clauses)) {
        $sql .= " WHERE " . implode(" AND ", $clauses);
    }

    $sql .= " ORDER BY COALESCE(up.publication_date, CONCAT(up.publication_year, '-01-01')) DESC, up.id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $rows = $stmt->fetchAll() ?: [];
    foreach ($rows as &$row) {
        $fullName = trim(((string)($row['first_name'] ?? '')) . ' ' . ((string)($row['last_name'] ?? '')));
        $row['bucket'] = 'user';
        $row['source_name'] = 'User Submission';
        $row['display_source'] = $fullName !== '' ? 'User Submission • ' . $fullName : 'User Submission';
        $row['submitted_by_me'] = isLoggedIn() && ((int)$row['user_id'] === (int)$_SESSION['user_id']);
    }

    return $rows;
}

function publications_sort_rows(array &$rows): void {
    usort($rows, function ($a, $b) {
        $dateA = $a['publication_date'] ?: (($a['publication_year'] ?? '') ? ($a['publication_year'] . '-01-01') : '1900-01-01');
        $dateB = $b['publication_date'] ?: (($b['publication_year'] ?? '') ? ($b['publication_year'] . '-01-01') : '1900-01-01');
        return strcmp($dateB, $dateA);
    });
}

function publications_handle_list(): void {
    $pdo = db();

    $search = trim((string)($_GET['q'] ?? ''));
    $source = trim((string)($_GET['source'] ?? 'all'));
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = (int)($_GET['perPage'] ?? 10);

    if (!in_array($source, ['all', 'api', 'user', 'mine'], true)) {
        $source = 'all';
    }

    if (!in_array($perPage, [10, 20, 30, 40, 50], true)) {
        $perPage = 10;
    }

    $syncStatus = publications_ensure_cache($pdo);

    $rows = [];
    if ($source === 'all' || $source === 'api') {
        $rows = array_merge($rows, publications_fetch_api_rows($pdo, $search));
    }
    if ($source === 'all' || $source === 'user' || $source === 'mine') {
        $rows = array_merge($rows, publications_fetch_user_rows($pdo, $search, $source));
    }

    publications_sort_rows($rows);

    $total = count($rows);
    $totalPages = max(1, (int)ceil($total / $perPage));
    if ($page > $totalPages) $page = $totalPages;

    $offset = ($page - 1) * $perPage;
    $items = array_slice($rows, $offset, $perPage);

    publications_json([
        'ok' => true,
        'items' => array_values($items),
        'pagination' => [
            'page' => $page,
            'perPage' => $perPage,
            'total' => $total,
            'totalPages' => $totalPages,
        ],
        'apiStatus' => $syncStatus,
        'isLoggedIn' => isLoggedIn(),
    ]);
}

function publications_clean_input($value, int $maxLength = 0): string {
    $value = strip_tags((string)$value);
    $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $value = preg_replace('/\s+/u', ' ', $value ?? '');
    $value = trim((string)$value);

    if ($maxLength > 0) {
        $value = mb_substr($value, 0, $maxLength);
    }

    return $value;
}

function publications_is_repeated_garbage(string $value): bool {
    $compact = preg_replace('/\s+/u', '', $value);
    return mb_strlen($compact) >= 3 && preg_match('/^([A-Za-z0-9])\1+$/u', $compact) === 1;
}

function publications_validate_iso_date(string $date): bool {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return false;
    }

    [$year, $month, $day] = array_map('intval', explode('-', $date));
    return checkdate($month, $day, $year);
}

function publications_handle_submit(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        publications_json(['ok' => false, 'error' => 'POST required'], 405);
    }

    if (!isLoggedIn()) {
        publications_json(['ok' => false, 'error' => 'You must be logged in to upload a publication.'], 401);
    }

    $payload = json_decode((string)file_get_contents('php://input'), true) ?? [];

    $title = publications_clean_input($payload['title'] ?? '', 300);
    $authors = publications_clean_input($payload['authors'] ?? '', 300);
    $journal = publications_clean_input($payload['journal'] ?? '', 200);
    $publicationYear = publications_clean_input($payload['publication_year'] ?? '', 4);
    $publicationDate = publications_clean_input($payload['publication_date'] ?? '', 10);
    $doi = publications_clean_input($payload['doi'] ?? '', 255);
    $originUrl = publications_clean_input($payload['origin_url'] ?? '', 1000);
    $abstractText = publications_clean_input($payload['abstract_text'] ?? '', 3000);
    $publicationType = strtolower(publications_clean_input($payload['publication_type'] ?? '', 100));

    $allowedPublicationTypes = [
        '',
        'article',
        'review',
        'report',
        'preprint',
        'case study',
        'book chapter',
        'thesis',
        'other',
    ];

    if ($title === '' || $authors === '') {
        publications_json(['ok' => false, 'error' => 'Title and authors are required.'], 400);
    }

    if (publications_is_repeated_garbage($title)) {
        publications_json(['ok' => false, 'error' => 'Title cannot be a repeated single character.'], 400);
    }

    if (publications_is_repeated_garbage($authors)) {
        publications_json(['ok' => false, 'error' => 'Authors cannot be a repeated single character.'], 400);
    }

    if ($journal !== '' && publications_is_repeated_garbage($journal)) {
        publications_json(['ok' => false, 'error' => 'Journal / Publisher cannot be a repeated single character.'], 400);
    }

    if ($abstractText !== '' && publications_is_repeated_garbage($abstractText)) {
        publications_json(['ok' => false, 'error' => 'Abstract / Summary cannot be a repeated single character.'], 400);
    }

    if ($publicationYear !== '') {
        if (!preg_match('/^\d{4}$/', $publicationYear)) {
            publications_json(['ok' => false, 'error' => 'Publication year must be a 4-digit year.'], 400);
        }

        $currentYear = (int)date('Y');
        $yearAsInt = (int)$publicationYear;
        if ($yearAsInt < 1900 || $yearAsInt > ($currentYear + 1)) {
            publications_json(['ok' => false, 'error' => 'Publication year is out of allowed range.'], 400);
        }
    }

    if ($publicationDate !== '' && !publications_validate_iso_date($publicationDate)) {
        publications_json(['ok' => false, 'error' => 'Publication date must be a real date in YYYY-MM-DD format.'], 400);
    }

    if ($publicationYear !== '' && $publicationDate !== '' && substr($publicationDate, 0, 4) !== $publicationYear) {
        publications_json(['ok' => false, 'error' => 'Publication date year must match publication year.'], 400);
    }

    if ($doi !== '' && !preg_match('/^10\.\d{4,9}\/[-._;()\/:A-Z0-9]+$/i', $doi)) {
        publications_json(['ok' => false, 'error' => 'DOI must be in a valid format.'], 400);
    }

    if ($originUrl !== '' && !filter_var($originUrl, FILTER_VALIDATE_URL)) {
        publications_json(['ok' => false, 'error' => 'Origin URL must be a valid URL.'], 400);
    }

    if ($originUrl !== '') {
        $scheme = strtolower((string)parse_url($originUrl, PHP_URL_SCHEME));
        if (!in_array($scheme, ['http', 'https'], true)) {
            publications_json(['ok' => false, 'error' => 'Origin URL must start with http:// or https://'], 400);
        }
    }

    if (!in_array($publicationType, $allowedPublicationTypes, true)) {
        publications_json(['ok' => false, 'error' => 'Publication type is invalid.'], 400);
    }

    $pdo = db();
    $stmt = $pdo->prepare("
        INSERT INTO user_publications (
            user_id,
            title,
            authors,
            journal,
            publication_year,
            publication_date,
            doi,
            origin_url,
            abstract_text,
            publication_type,
            approval_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    ");

    $stmt->execute([
        (int)$_SESSION['user_id'],
        $title,
        $authors,
        $journal,
        $publicationYear !== '' ? (int)$publicationYear : null,
        $publicationDate !== '' ? $publicationDate : null,
        $doi,
        $originUrl,
        $abstractText,
        $publicationType,
    ]);

    publications_json([
        'ok' => true,
        'message' => 'Publication submitted for admin approval.'
    ]);
}

$route = $_GET['r'] ?? '';

if ($route === 'publications-list') {
    publications_handle_list();
}

if ($route === 'publications-submit') {
    publications_handle_submit();
}

publications_json(['ok' => false, 'error' => 'Invalid publications route.'], 400);