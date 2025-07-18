<?php
// debug
error_log('API Called - Request Details:');
error_log('Headers: ' . json_encode(getallheaders()));
error_log('GET params: ' . json_encode($_GET));

header('Content-Type: application/json');

$config = require_once '/var/www/jmfc/config/config.php';

$allowedOrigins = $config['allowed_origins'] ?? [];

// CORS configuration
// $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
// if (in_array($origin, $allowedOrigins)) {
//     header("Access-Control-Allow-Origin: $origin");
// } else {
//     header('Access-Control-Allow-Origin: https://jmfc.dynseo.com');
// }

// header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
// header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
// header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$headers = getallheaders();
$auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';

error_log('Auth header: ' . $auth_header);

if (!$auth_header || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
    error_log('Auth failed: No valid Authorization header');
    http_response_code(401);
    echo json_encode([
        'error' => 'Unauthorized',
        'message' => 'No valid authorization header found'
    ]);
    exit;
}

$token = $matches[1];

$username = isset($_GET['username']) ? $_GET['username'] : '';

if (empty($username)) {
    http_response_code(400);
    echo json_encode(['error' => 'Username required']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host={$config['db']['host']};dbname={$config['db']['name']}",
        $config['db']['user'],
        $config['db']['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // check subscription
    $stmt = $pdo->prepare("
        SELECT a.statut, a.date_debut, a.date_fin, a.subscription_type, a.montant, a.frequence_paiement
        FROM clients c 
        JOIN abonnements a ON c.id_client = a.id_client 
        WHERE c.key_name = :username 
            AND a.statut = 'actif' 
            AND a.date_debut <= NOW() 
            AND (a.date_fin IS NULL OR a.date_fin > NOW())
        ORDER BY a.date_debut DESC
        LIMIT 1
    ");

    $stmt->execute(['username' => $username]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    error_log('Database result: ' . json_encode($result));

    if ($result) {
        //last connection
        $updateStmt = $pdo->prepare("
            UPDATE clients 
            SET derniere_connexion = NOW() 
            WHERE key_name = :username
        ");
        
        $updateStmt->execute(['username' => $username]);

        echo json_encode([
            'active' => true,
            'subscription_type' => $result['subscription_type'],
            'date_debut' => $result['date_debut'],
            'date_fin' => $result['date_fin'],
            'montant' => $result['montant'],
            'frequence_paiement' => $result['frequence_paiement'],
            'is_trial' => floatval($result['montant']) === 0.0,
            'timestamp' => date('c')
        ]);
    } else {
        echo json_encode([
            'active' => false,
            'message' => 'Aucun abonnement actif trouvé'
        ]);
    }

} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => 'Erreur lors de la vérification de l\'abonnement'
    ]);
}
?>
