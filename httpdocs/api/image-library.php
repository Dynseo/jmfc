<?php
header('Content-Type: application/json');

require_once __DIR__ . '/utils/auth.php';

$configPath = '/var/www/jmfc/config/config.php';
$config = file_exists($configPath) ? require $configPath : null;
$allowedOrigins = $config['allowed_origins'] ?? [];

// jmfc_send_cors_headers($allowedOrigins);
$libraryBaseUrl = jmfc_compute_library_base_url($allowedOrigins);

error_log('Image Library API accessed from ' . ($_SERVER['HTTP_ORIGIN'] ?? 'unknown origin'));

// Handle CORS preflight if needed (kept consistent with other API endpoints)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$libraryDir = realpath(__DIR__ . '/../app/library-images');
if ($libraryDir === false) {
    // Directory might not exist yet (e.g., fresh install)
    $libraryDir = __DIR__ . '/../app/library-images';
    if (!is_dir($libraryDir)) {
        if (!mkdir($libraryDir, 0775, true) && !is_dir($libraryDir)) {
            http_response_code(500);
            echo json_encode([
                'error' => 'internal_error',
                'message' => 'Unable to create image library directory'
            ]);
            exit();
        }
    }
}

$indexFile = $libraryDir . '/index.json';
if (!file_exists($indexFile)) {
    file_put_contents($indexFile, json_encode([]), LOCK_EX);
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGet($indexFile, $libraryBaseUrl);
        break;
    case 'POST':
        $session = jmfc_require_session(true);
        handlePost($indexFile, $libraryDir, $session, $libraryBaseUrl);
        break;
    case 'PUT':
    case 'PATCH':
        $session = jmfc_require_session(true);
        handlePut($indexFile, $libraryDir, $session, $libraryBaseUrl);
        break;
    case 'DELETE':
        $session = jmfc_require_session(true);
        handleDelete($indexFile, $libraryDir, $session);
        break;
    default:
        http_response_code(405);
        echo json_encode([
            'error' => 'method_not_allowed',
            'message' => 'Unsupported HTTP method'
        ]);
        break;
}

function handleGet(string $indexFile, string $baseUrl): void
{
    $images = loadImages($indexFile);
    $images = jmfc_prepare_images_for_response($images, $baseUrl);
    error_log('Image Library GET returning ' . count($images) . ' images.');
    echo json_encode([
        'images' => $images
    ]);
}

function handlePost(string $indexFile, string $libraryDir, array $session, string $baseUrl): void
{
    $payload = readJsonPayload();

    $name = trim((string)($payload['name'] ?? ''));
    $description = trim((string)($payload['description'] ?? ''));
    $tags = normaliseTags($payload['tags'] ?? []);
    $imageData = $payload['imageData'] ?? null;

    if ($name === '' || !$imageData) {
        http_response_code(400);
        echo json_encode([
            'error' => 'invalid_payload',
            'message' => 'Name and imageData are required'
        ]);
        return;
    }

    $imageInfo = decodeBase64Image($imageData);
    if (!$imageInfo) {
        http_response_code(400);
        echo json_encode([
            'error' => 'invalid_image',
            'message' => 'Image data is invalid or unsupported'
        ]);
        return;
    }

    if ($imageInfo['size'] > 5 * 1024 * 1024) { // 5 MB limit
        http_response_code(400);
        echo json_encode([
            'error' => 'image_too_large',
            'message' => 'Image exceeds maximum size of 5 MB'
        ]);
        return;
    }

    $id = uniqid('img_', true);
    $fileName = $id . '.' . $imageInfo['extension'];
    $filePath = $libraryDir . '/' . $fileName;

    if (file_put_contents($filePath, $imageInfo['binary'], LOCK_EX) === false) {
        http_response_code(500);
        echo json_encode([
            'error' => 'write_error',
            'message' => 'Unable to store image file'
        ]);
        return;
    }

    $images = loadImages($indexFile);
    $now = gmdate('c');
    $newImage = [
        'id' => $id,
        'name' => $name,
        'description' => $description,
        'tags' => $tags,
        'file' => $fileName,
        'url' => '/app/library-images/' . $fileName,
        'createdAt' => $now,
        'updatedAt' => $now,
        'createdBy' => $session['user_id'] ?? null,
        'updatedBy' => $session['user_id'] ?? null
    ];
    $images[] = $newImage;

    if (!saveImages($indexFile, $images)) {
        @unlink($filePath);
        http_response_code(500);
        echo json_encode([
            'error' => 'write_error',
            'message' => 'Unable to persist image metadata'
        ]);
        return;
    }

    http_response_code(201);
    error_log('Image Library API created new image: ' . $newImage['id']);
    echo json_encode([
        'image' => jmfc_prepare_image_for_response($newImage, $baseUrl)
    ]);
}

function handlePut(string $indexFile, string $libraryDir, array $session, string $baseUrl): void
{
    $payload = readJsonPayload();

    $id = $payload['id'] ?? ($_GET['id'] ?? null);
    if (!$id) {
        http_response_code(400);
        echo json_encode([
            'error' => 'invalid_payload',
            'message' => 'Image id is required'
        ]);
        return;
    }

    $images = loadImages($indexFile);
    $index = null;
    foreach ($images as $key => $item) {
        if (($item['id'] ?? '') === $id) {
            $index = $key;
            break;
        }
    }

    if ($index === null) {
        http_response_code(404);
        echo json_encode([
            'error' => 'not_found',
            'message' => 'Image not found'
        ]);
        return;
    }

    $image = $images[$index];
    $name = isset($payload['name']) ? trim((string)$payload['name']) : $image['name'];
    $description = isset($payload['description']) ? trim((string)$payload['description']) : ($image['description'] ?? '');
    $tags = isset($payload['tags']) ? normaliseTags($payload['tags']) : ($image['tags'] ?? []);

    if ($name === '') {
        http_response_code(400);
        echo json_encode([
            'error' => 'invalid_payload',
            'message' => 'Name cannot be empty'
        ]);
        return;
    }

    $replaceImage = null;
    if (!empty($payload['imageData'])) {
        $imageInfo = decodeBase64Image($payload['imageData']);
        if (!$imageInfo) {
            http_response_code(400);
            echo json_encode([
                'error' => 'invalid_image',
                'message' => 'Image data is invalid or unsupported'
            ]);
            return;
        }
        if ($imageInfo['size'] > 5 * 1024 * 1024) {
            http_response_code(400);
            echo json_encode([
                'error' => 'image_too_large',
                'message' => 'Image exceeds maximum size of 5 MB'
            ]);
            return;
        }
        $replaceImage = $imageInfo;
    }

    $now = gmdate('c');

    if ($replaceImage) {
        $fileName = $image['id'] . '.' . $replaceImage['extension'];
        $filePath = $libraryDir . '/' . $fileName;
        if (file_put_contents($filePath, $replaceImage['binary'], LOCK_EX) === false) {
            http_response_code(500);
            echo json_encode([
                'error' => 'write_error',
                'message' => 'Unable to replace image file'
            ]);
            return;
        }
        // Delete old file if filename changed
        if (!empty($image['file']) && $image['file'] !== $fileName) {
            @unlink($libraryDir . '/' . $image['file']);
        }
        $image['file'] = $fileName;
        $image['url'] = '/app/library-images/' . $fileName;
    }

    $image['name'] = $name;
    $image['description'] = $description;
    $image['tags'] = $tags;
    $image['updatedAt'] = $now;
    $image['updatedBy'] = $session['user_id'] ?? null;

    $images[$index] = $image;

    if (!saveImages($indexFile, $images)) {
        http_response_code(500);
        echo json_encode([
            'error' => 'write_error',
            'message' => 'Unable to persist image metadata'
        ]);
        return;
    }

    echo json_encode([
        'image' => jmfc_prepare_image_for_response($image, $baseUrl)
    ]);
}

function handleDelete(string $indexFile, string $libraryDir, array $session): void
{
    $id = $_GET['id'] ?? null;
    if (!$id) {
        $payload = readJsonPayload(false);
        if ($payload && isset($payload['id'])) {
            $id = $payload['id'];
        }
    }

    if (!$id) {
        http_response_code(400);
        echo json_encode([
            'error' => 'invalid_payload',
            'message' => 'Image id is required'
        ]);
        return;
    }

    $images = loadImages($indexFile);
    $index = null;
    foreach ($images as $key => $item) {
        if (($item['id'] ?? '') === $id) {
            $index = $key;
            break;
        }
    }

    if ($index === null) {
        http_response_code(404);
        echo json_encode([
            'error' => 'not_found',
            'message' => 'Image not found'
        ]);
        return;
    }

    $image = $images[$index];
    unset($images[$index]);
    $images = array_values($images);

    if (!saveImages($indexFile, $images)) {
        http_response_code(500);
        echo json_encode([
            'error' => 'write_error',
            'message' => 'Unable to persist image metadata'
        ]);
        return;
    }

    if (!empty($image['file'])) {
        @unlink($libraryDir . '/' . $image['file']);
    }

    echo json_encode([
        'deleted' => true
    ]);
}

// function jmfc_send_cors_headers(array $allowedOrigins): void
// {
//     $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
//     $allowAny = in_array('*', $allowedOrigins, true);

//     if ($allowAny) {
//         header('Access-Control-Allow-Origin: *');
//     } elseif ($origin && in_array($origin, $allowedOrigins, true)) {
//         header('Access-Control-Allow-Origin: ' . $origin);
//         header('Vary: Origin');
//     }

//     header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
//     header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept');
//     header('Access-Control-Expose-Headers: Content-Type');
//     header('Access-Control-Max-Age: 86400');
// }

function jmfc_compute_library_base_url(array $allowedOrigins): string
{
    foreach ($allowedOrigins as $origin) {
        if ($origin === '*' || !$origin) {
            continue;
        }
        if (filter_var($origin, FILTER_VALIDATE_URL)) {
            return rtrim($origin, '/');
        }
    }

    $scheme = 'http';
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO'])) {
        $forwarded = explode(',', $_SERVER['HTTP_X_FORWARDED_PROTO']);
        $scheme = trim($forwarded[0]);
    } elseif (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        $scheme = 'https';
    }

    $host = $_SERVER['HTTP_HOST'] ?? ($_SERVER['SERVER_NAME'] ?? 'localhost');

    return $scheme . '://' . $host;
}

function jmfc_prepare_image_for_response(array $image, string $baseUrl): array
{
    $relative = $image['url'] ?? '';
    if (!$relative) {
        $image['publicUrl'] = null;
        return $image;
    }

    if (preg_match('/^https?:\/\//i', $relative)) {
        $image['publicUrl'] = $relative;
        return $image;
    }

    $image['publicUrl'] = rtrim($baseUrl, '/') . '/' . ltrim($relative, '/');
    return $image;
}

function jmfc_prepare_images_for_response(array $images, string $baseUrl): array
{
    $prepared = [];
    foreach ($images as $image) {
        if (is_array($image)) {
            $prepared[] = jmfc_prepare_image_for_response($image, $baseUrl);
        }
    }
    return $prepared;
}

function loadImages(string $indexFile): array
{
    $json = file_get_contents($indexFile);
    if ($json === false) {
        return [];
    }
    $decoded = json_decode($json, true);
    return is_array($decoded) ? $decoded : [];
}

function saveImages(string $indexFile, array $images): bool
{
    $json = json_encode($images, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    return file_put_contents($indexFile, $json, LOCK_EX) !== false;
}

function readJsonPayload(bool $expectJson = true): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if ($expectJson && !is_array($data)) {
        http_response_code(400);
        echo json_encode([
            'error' => 'invalid_json',
            'message' => 'Unable to decode JSON payload'
        ]);
        exit();
    }
    return is_array($data) ? $data : [];
}

function normaliseTags($tags): array
{
    if (is_string($tags)) {
        $parts = preg_split('/[,;]/', $tags);
    } elseif (is_array($tags)) {
        $parts = $tags;
    } else {
        return [];
    }
    $normalized = [];
    foreach ($parts as $part) {
        $value = trim((string)$part);
        if ($value !== '') {
            $normalized[] = $value;
        }
    }
    return array_values(array_unique($normalized));
}

function decodeBase64Image(string $data): ?array
{
    if (!preg_match('/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,(.+)$/', $data, $matches)) {
        return null;
    }
    $mime = strtolower($matches[1]);
    $base64 = $matches[2];
    $binary = base64_decode($base64, true);
    if ($binary === false) {
        return null;
    }

    $extensions = [
        'jpeg' => 'jpg',
        'jpg' => 'jpg',
        'png' => 'png',
        'webp' => 'webp',
        'gif' => 'gif',
        'svg+xml' => 'svg'
    ];

    if (!isset($extensions[$mime])) {
        return null;
    }

    return [
        'extension' => $extensions[$mime],
        'binary' => $binary,
        'size' => strlen($binary)
    ];
}
