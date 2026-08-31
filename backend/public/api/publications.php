<?php
declare(strict_types=1);

require_once __DIR__ . '/../../src/db.php';
require_once __DIR__ . '/../../src/auth.php';

const PUBLICATIONS_CACHE_TTL_SECONDS = 1800;
const PUBLICATIONS_SYNC_PROVIDER = 'OpenAlex';
const PUBLICATIONS_MAX_UPLOAD_BYTES = 5242880; // 5 MB

function publications_json(array $payload, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
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
        'livestock epidemic disease surveillance agriculture outbreak',
        'zoonotic livestock disease spread agriculture surveillance',
    ];
}

function publications_is_relevant(string $text): bool {
    $haystack = mb_strtolower($text);

    $mustHaveOne = [
        'livestock',
        'cattle',
        'swine',
        'pig',
        'poultry',
        'chicken',
        'turkey',
        'goat',
        'sheep',
        'dairy',
        'farm',
        'agriculture',
        'bovine',
        'avian',
    ];

    $mustHaveDisease = [
        'disease',
        'outbreak',
        'epidemic',
        'virus',
        'influenza',
        'flu',
        'tuberculosis',
        'fever',
        'infection',
        'pathogen',
        'surveillance',
        'biosecurity',
    ];

    $hasLivestock = false;
    foreach ($mustHaveOne as $term) {
        if (str_contains($haystack, $term)) {
            $hasLivestock = true;
            break;
        }
    }

    if (!$hasLivestock) {
        return false;
    }

    foreach ($mustHaveDisease as $term) {
        if (str_contains($haystack, $term)) {
            return true;
        }
    }

    return false;
}

function publications_join_authors(array $authorships): string {
    $names = [];
    foreach ($authorships as $entry) {
        $display = trim((string)($entry['author']['display_name'] ?? ''));
        if ($display !== '') {
            $names[] = $display;
        }
    }
    return implode(', ', array_slice($names, 0, 8));
}

function publications_extract_journal(array $work): string {
    return trim((string)(
        $work['primary_location']['source']['display_name']
        ?? $work['host_venue']['display_name']
        ?? ''
    ));
}

function publications_extract_origin_url(array $work): string {
    $landing = trim((string)($work['primary_location']['landing_page_url'] ?? ''));
    if ($landing !== '') {
        return $landing;
    }

    $pdf = trim((string)($work['primary_location']['pdf_url'] ?? ''));
    if ($pdf !== '') {
        return $pdf;
    }

    $doi = trim((string)($work['doi'] ?? ''));
    if ($doi !== '') {
        return $doi;
    }

    return '';
}

function publications_rebuild_abstract(?array $abstractIndex): string {
    if (!$abstractIndex || !is_array($abstractIndex)) {
        return '';
    }

    $positions = [];
    foreach ($abstractIndex as $word => $indexes) {
        if (!is_array($indexes)) {
            continue;
        }
        foreach ($indexes as $pos) {
            $positions[(int)$pos] = (string)$word;
        }
    }

    if (!$positions) {
        return '';
    }

    ksort($positions);
    return implode(' ', $positions);
}

function publications_http_get_json(string $url): array {
    $opts = [
        'http' => [
            'method' => 'GET',
            'timeout' => 15,
            'header' => "Accept: application/json\r\nUser-Agent: CSE442-Publications/1.0\r\n",
        ],
    ];

    $context = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);

    if ($response === false) {
        throw new RuntimeException('Failed to reach publications provider');
    }

    $decoded = json_decode($response, true);
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
        'message' => $message,
    ];
}

function publications_get_last_cache_time(PDO $pdo): ?int {
    $stmt = $pdo->query("SELECT MAX(cached_at) AS latest FROM api_publications_cache");
    $row = $stmt->fetch();
    if (!$row || empty($row['latest'])) {
        return null;
    }

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
            'ran_at' => null,
        ];
    }

    return [
        'status' => (string)$row['status'],
        'message' => (string)$row['message'],
        'ran_at' => (string)$row['ran_at'],
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
            'ran_at' => date('Y-m-d H:i:s'),
        ];
    } catch (Throwable $e) {
        $message = 'OpenAlex sync failed. Serving cached publications instead. ' . $e->getMessage();
        publications_log_sync($pdo, 'down', $message);

        return [
            'status' => 'down',
            'message' => $message,
            'ran_at' => date('Y-m-d H:i:s'),
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
        $row['uploaded_file_available'] = false;
        $row['uploaded_original_filename'] = null;
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
            up.origin_url,
            up.uploaded_file_path,
            up.uploaded_original_filename,
            up.uploaded_mime_type,
            up.uploaded_file_size,
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
            OR up.uploaded_original_filename LIKE ?
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
        $row['uploaded_file_available'] = !empty($row['uploaded_file_path']);
    }

    return $rows;
}

function publications_paginate(array $rows, int $page, int $perPage): array {
    $total = count($rows);
    $totalPages = max(1, (int)ceil($total / $perPage));
    $page = max(1, min($page, $totalPages));
    $offset = ($page - 1) * $perPage;

    return [
        'items' => array_slice($rows, $offset, $perPage),
        'pagination' => [
            'page' => $page,
            'perPage' => $perPage,
            'total' => $total,
            'totalPages' => $totalPages,
        ],
    ];
}

function publications_handle_list(): void {
    $pdo = db();
    $apiStatus = publications_ensure_cache($pdo);

    $search = trim((string)($_GET['q'] ?? ''));
    $source = strtolower(trim((string)($_GET['source'] ?? 'all')));
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = (int)($_GET['perPage'] ?? 10);
    if (!in_array($perPage, [10, 20, 30, 40, 50], true)) {
        $perPage = 10;
    }

    $apiRows = [];
    $userRows = [];

    if ($source === 'all' || $source === 'api') {
        $apiRows = publications_fetch_api_rows($pdo, $search);
    }

    if ($source === 'all' || $source === 'user' || $source === 'mine') {
        $userRows = publications_fetch_user_rows($pdo, $search, $source);
    }

    $combined = array_merge($apiRows, $userRows);

    usort($combined, static function (array $a, array $b): int {
        $dateA = strtotime((string)($a['publication_date'] ?? ''));
        $dateB = strtotime((string)($b['publication_date'] ?? ''));

        if ($dateA && $dateB) {
            return $dateB <=> $dateA;
        }

        $yearA = (int)($a['publication_year'] ?? 0);
        $yearB = (int)($b['publication_year'] ?? 0);

        if ($yearA !== $yearB) {
            return $yearB <=> $yearA;
        }

        return ((int)$b['id']) <=> ((int)$a['id']);
    });

    $paged = publications_paginate($combined, $page, $perPage);

    publications_json([
        'ok' => true,
        'items' => $paged['items'],
        'pagination' => $paged['pagination'],
        'apiStatus' => $apiStatus,
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

function publications_clean_url_input($value, int $maxLength = 0): string {
    $value = strip_tags((string)$value);
    $value = html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $value = preg_replace('/\s+/u', '', $value ?? '');
    $value = trim((string)$value);

    if ($maxLength > 0) {
        $value = mb_substr($value, 0, $maxLength);
    }

    return $value;
}

function publications_sanitize_filename(string $filename): string {
    $filename = basename($filename);
    $filename = preg_replace('/[^A-Za-z0-9._ -]/', '_', $filename) ?? 'publication.pdf';
    $filename = trim($filename);

    if ($filename === '') {
        return 'publication.pdf';
    }

    return mb_substr($filename, 0, 255);
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

function publications_validate_user_url(string $url): ?string {
    if ($url === '') {
        return null;
    }

    if (mb_strlen($url) > 1000) {
        return 'Origin URL is too long.';
    }

    if (preg_match('/[<>]/u', $url)) {
        return 'Origin URL contains invalid characters.';
    }

    if (preg_match('/(javascript:|data:|vbscript:|file:|<script)/iu', $url)) {
        return 'Origin URL contains disallowed content.';
    }

    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        return 'Origin URL must be a valid URL.';
    }

    $scheme = strtolower((string)parse_url($url, PHP_URL_SCHEME));
    if (!in_array($scheme, ['http', 'https'], true)) {
        return 'Origin URL must start with http:// or https://';
    }

    $host = (string)parse_url($url, PHP_URL_HOST);
    if ($host === '' || mb_strlen($host) < 2) {
        return 'Origin URL must include a valid domain.';
    }

    return null;
}

function publications_validate_uploaded_pdf(array $file): ?string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        return 'Uploaded file could not be processed.';
    }

    $filename = strtolower((string)($file['name'] ?? ''));
    if (!str_ends_with($filename, '.pdf')) {
        return 'Uploaded file must be a PDF.';
    }

    $size = (int)($file['size'] ?? 0);
    if ($size <= 0) {
        return 'Uploaded file is empty.';
    }

    if ($size > PUBLICATIONS_MAX_UPLOAD_BYTES) {
        return 'Uploaded PDF must be 5 MB or smaller.';
    }

    $tmpName = (string)($file['tmp_name'] ?? '');
    if ($tmpName === '' || !is_uploaded_file($tmpName)) {
        return 'Uploaded file is invalid.';
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = strtolower((string)$finfo->file($tmpName));
    if (!in_array($mimeType, ['application/pdf', 'application/x-pdf'], true)) {
        return 'Uploaded file must be a PDF.';
    }

    $handle = @fopen($tmpName, 'rb');
    if ($handle === false) {
        return 'Uploaded file could not be inspected.';
    }

    $signature = fread($handle, 5);
    fclose($handle);

    if ($signature !== '%PDF-') {
        return 'Uploaded file must be a valid PDF.';
    }

    return null;
}

function publications_upload_storage_dir(): string {
    return dirname(__DIR__, 2) . '/storage/publication_uploads';
}

function publications_store_uploaded_pdf(array $file): array {
    $storageDir = publications_upload_storage_dir();

    if (!is_dir($storageDir) && !mkdir($storageDir, 0755, true) && !is_dir($storageDir)) {
        throw new RuntimeException('Upload storage directory could not be created.');
    }

    $randomName = bin2hex(random_bytes(16)) . '.pdf';
    $absolutePath = $storageDir . '/' . $randomName;

    if (!move_uploaded_file((string)$file['tmp_name'], $absolutePath)) {
        throw new RuntimeException('Uploaded PDF could not be saved.');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = (string)$finfo->file($absolutePath);

    return [
        'uploaded_file_path' => 'storage/publication_uploads/' . $randomName,
        'uploaded_original_filename' => publications_sanitize_filename((string)($file['name'] ?? 'publication.pdf')),
        'uploaded_mime_type' => $mimeType !== '' ? $mimeType : 'application/pdf',
        'uploaded_file_size' => (int)filesize($absolutePath),
        'absolute_path' => $absolutePath,
    ];
}

function publications_current_user_is_admin(PDO $pdo): bool {
    if (!isLoggedIn()) {
        return false;
    }

    $stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([(int)$_SESSION['user_id']]);
    $row = $stmt->fetch();

    return $row && (int)$row['is_admin'] === 1;
}

function publications_handle_submit(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        publications_json(['ok' => false, 'error' => 'POST required'], 405);
    }

    if (!isLoggedIn()) {
        publications_json(['ok' => false, 'error' => 'You must be logged in to upload a publication.'], 401);
    }

    $isMultipart = !empty($_POST) || !empty($_FILES);

    if ($isMultipart) {
        $payload = $_POST;
    } else {
        $payload = json_decode((string)file_get_contents('php://input'), true) ?? [];
    }

    $title = publications_clean_input($payload['title'] ?? '', 300);
    $authors = publications_clean_input($payload['authors'] ?? '', 300);
    $journal = publications_clean_input($payload['journal'] ?? '', 200);
    $publicationYear = publications_clean_input($payload['publication_year'] ?? '', 4);
    $publicationDate = publications_clean_input($payload['publication_date'] ?? '', 10);
    $originUrl = publications_clean_url_input($payload['origin_url'] ?? '', 1000);
    $abstractText = publications_clean_input($payload['abstract_text'] ?? '', 3000);
    $publicationType = strtolower(publications_clean_input($payload['publication_type'] ?? '', 100));
    $uploadedFile = $_FILES['uploaded_file'] ?? null;

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

    $urlError = publications_validate_user_url($originUrl);
    if ($urlError !== null) {
        publications_json(['ok' => false, 'error' => $urlError], 400);
    }

    $fileError = $uploadedFile ? publications_validate_uploaded_pdf($uploadedFile) : null;
    if ($fileError !== null) {
        publications_json(['ok' => false, 'error' => $fileError], 400);
    }

    if ($originUrl === '' && !$uploadedFile) {
        publications_json(['ok' => false, 'error' => 'Provide either an external link or upload a PDF.'], 400);
    }

    if (!in_array($publicationType, $allowedPublicationTypes, true)) {
        publications_json(['ok' => false, 'error' => 'Publication type is invalid.'], 400);
    }

    $storedFile = null;

    try {
        if ($uploadedFile && ($uploadedFile['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $storedFile = publications_store_uploaded_pdf($uploadedFile);
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
                origin_url,
                uploaded_file_path,
                uploaded_original_filename,
                uploaded_mime_type,
                uploaded_file_size,
                abstract_text,
                publication_type,
                approval_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        ");

        $stmt->execute([
            (int)$_SESSION['user_id'],
            $title,
            $authors,
            $journal,
            $publicationYear !== '' ? (int)$publicationYear : null,
            $publicationDate !== '' ? $publicationDate : null,
            $originUrl,
            $storedFile['uploaded_file_path'] ?? null,
            $storedFile['uploaded_original_filename'] ?? null,
            $storedFile['uploaded_mime_type'] ?? null,
            $storedFile['uploaded_file_size'] ?? null,
            $abstractText,
            $publicationType,
        ]);
    } catch (Throwable $e) {
        if ($storedFile && !empty($storedFile['absolute_path']) && file_exists($storedFile['absolute_path'])) {
            @unlink($storedFile['absolute_path']);
        }
        publications_json(['ok' => false, 'error' => 'Submission failed.'], 500);
    }

    publications_json([
        'ok' => true,
        'message' => 'Publication submitted for admin approval.',
    ]);
}

function publications_handle_download(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        publications_json(['ok' => false, 'error' => 'GET required'], 405);
    }

    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        publications_json(['ok' => false, 'error' => 'Valid publication id required.'], 400);
    }

    $pdo = db();
    $stmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            approval_status,
            uploaded_file_path,
            uploaded_original_filename,
            uploaded_mime_type
        FROM user_publications
        WHERE id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
    $row = $stmt->fetch();

    if (!$row || empty($row['uploaded_file_path'])) {
        publications_json(['ok' => false, 'error' => 'Uploaded file not found.'], 404);
    }

    $isOwner = isLoggedIn() && (int)$row['user_id'] === (int)($_SESSION['user_id'] ?? 0);
    $isAdmin = publications_current_user_is_admin($pdo);
    $isApproved = (string)$row['approval_status'] === 'approved';

    if (!$isApproved && !$isOwner && !$isAdmin) {
        publications_json(['ok' => false, 'error' => 'You are not allowed to view this file.'], 403);
    }

    $relativePath = str_replace(['..\\', '../', "\0"], '', (string)$row['uploaded_file_path']);
    $absolutePath = dirname(__DIR__, 2) . '/' . ltrim($relativePath, '/');

    if (!is_file($absolutePath)) {
        publications_json(['ok' => false, 'error' => 'Uploaded file not found on server.'], 404);
    }

    $filename = publications_sanitize_filename((string)($row['uploaded_original_filename'] ?? 'publication.pdf'));
    $mimeType = (string)($row['uploaded_mime_type'] ?? 'application/pdf');

    header_remove('Content-Type');
    http_response_code(200);
    header('Content-Type: ' . $mimeType);
    header('Content-Length: ' . (string)filesize($absolutePath));
    header('X-Content-Type-Options: nosniff');
    header('Content-Disposition: inline; filename="' . addslashes($filename) . '"');

    readfile($absolutePath);
    exit;
}

$route = $_GET['r'] ?? '';

if ($route === 'publications-list') {
    publications_handle_list();
}

if ($route === 'publications-submit') {
    publications_handle_submit();
}

if ($route === 'publications-download') {
    publications_handle_download();
}