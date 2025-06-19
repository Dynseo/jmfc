<?php
$config = require_once '/var/www/jmfc/config/config.php';

// CORS configuration
if (!empty($config['allowed_origins']) && is_array($config['allowed_origins'])) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $config['allowed_origins'])) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
}
header('Access-Control-Allow-Methods: DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';

    if (empty($username)) {
        throw new Exception('Username is required');
    }

    $pdo = new PDO(
        "mysql:host={$config['db']['host']};dbname={$config['db']['name']}",
        $config['db']['user'],
        $config['db']['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $pdo->beginTransaction();

    try {
        $stmtDeleteAbonnements = $pdo->prepare("
            DELETE FROM abonnements 
            WHERE id_client IN (
                SELECT id_client 
                FROM clients 
                WHERE key_name = :username
            )
        ");
        $stmtDeleteAbonnements->execute(['username' => $username]);

        $stmtDeleteClient = $pdo->prepare("
            DELETE FROM clients 
            WHERE key_name = :username
        ");
        $stmtDeleteClient->execute(['username' => $username]);

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'User deleted successfully'
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    error_log("Delete user error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Delete user failed',
        'message' => $e->getMessage()
    ]);
}
