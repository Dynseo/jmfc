<?php
// API pour mettre à jour les abonnements après un paiement in-app
error_log('Update Subscription API Called');

header('Content-Type: application/json');

$config = require_once '/var/www/jmfc/config/config.php';

// Configuration CORS
$allowedOrigins = $config['allowed_origins'] ?? [];
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

// Vérification de l'authentification
$headers = getallheaders();
$auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';

if (!$auth_header || !preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
    http_response_code(401);
    echo json_encode([
        'error' => 'Unauthorized',
        'message' => 'No valid authorization header found'
    ]);
    exit;
}

$token = $matches[1];

// Lecture des données JSON
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

if (!$data) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid JSON',
        'message' => 'Invalid JSON data received'
    ]);
    exit;
}

// Validation des données requises
$required_fields = ['username', 'productId', 'subscriptionType', 'platform'];
foreach ($required_fields as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Missing required field',
            'message' => "Field '$field' is required"
        ]);
        exit;
    }
}

$username = $data['username'];
$productId = $data['productId'];
$transactionId = $data['transactionId'] ?? null;
$purchaseToken = $data['purchaseToken'] ?? null;
$purchaseTime = $data['purchaseTime'] ?? time() * 1000; // Convertir en millisecondes
$subscriptionType = $data['subscriptionType'];
$platform = $data['platform'];

error_log("Processing subscription update for user: $username, product: $productId, type: $subscriptionType");

try {
    $pdo = new PDO(
        "mysql:host={$config['db']['host']};dbname={$config['db']['name']}",
        $config['db']['user'],
        $config['db']['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Commencer une transaction
    $pdo->beginTransaction();

    // Vérifier si l'utilisateur existe
    $stmt = $pdo->prepare("SELECT id_client FROM clients WHERE key_name = :username");
    $stmt->execute(['username' => $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode([
            'error' => 'User not found',
            'message' => 'User not found in database'
        ]);
        exit;
    }

    $userId = $user['id_client'];

    // Désactiver les anciens abonnements
    $stmt = $pdo->prepare("
        UPDATE abonnements 
        SET statut = 'inactif', 
            date_fin = NOW(),
            updated_at = NOW()
        WHERE id_client = :user_id 
            AND statut = 'actif'
    ");
    $stmt->execute(['user_id' => $userId]);

    // Calculer les dates d'abonnement
    $dateDebut = new DateTime();
    $dateFin = null;
    
    switch ($subscriptionType) {
        case 'monthly':
            $dateFin = (clone $dateDebut)->modify('+1 month');
            break;
        case 'yearly':
            $dateFin = (clone $dateDebut)->modify('+1 year');
            break;
        case 'lifetime':
            $dateFin = null; // Pas de date de fin pour lifetime
            break;
        default:
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode([
                'error' => 'Invalid subscription type',
                'message' => 'Invalid subscription type: ' . $subscriptionType
            ]);
            exit;
    }

    // Déterminer la formule (ID dans la table formules)
    $formule = $config['subscription']['default_formule'] ?? 1;

    // Créer le nouvel abonnement
    $stmt = $pdo->prepare("
        INSERT INTO abonnements (
            id_client, 
            id_formule, 
            statut, 
            date_debut, 
            date_fin, 
            transaction_id,
            purchase_token,
            purchase_time,
            product_id,
            platform,
            subscription_type,
            created_at,
            updated_at
        ) VALUES (
            :user_id, 
            :formule, 
            'actif', 
            :date_debut, 
            :date_fin, 
            :transaction_id,
            :purchase_token,
            :purchase_time,
            :product_id,
            :platform,
            :subscription_type,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'formule' => $formule,
        'date_debut' => $dateDebut->format('Y-m-d H:i:s'),
        'date_fin' => $dateFin ? $dateFin->format('Y-m-d H:i:s') : null,
        'transaction_id' => $transactionId,
        'purchase_token' => $purchaseToken,
        'purchase_time' => date('Y-m-d H:i:s', $purchaseTime / 1000),
        'product_id' => $productId,
        'platform' => $platform,
        'subscription_type' => $subscriptionType
    ]);

    // Mettre à jour la dernière connexion
    $stmt = $pdo->prepare("
        UPDATE clients 
        SET derniere_connexion = NOW(),
            updated_at = NOW()
        WHERE id_client = :user_id
    ");
    $stmt->execute(['user_id' => $userId]);

    // Valider la transaction
    $pdo->commit();

    error_log("Subscription updated successfully for user: $username");

    echo json_encode([
        'success' => true,
        'message' => 'Subscription updated successfully',
        'subscription' => [
            'type' => $subscriptionType,
            'start_date' => $dateDebut->format('Y-m-d H:i:s'),
            'end_date' => $dateFin ? $dateFin->format('Y-m-d H:i:s') : null,
            'status' => 'actif'
        ]
    ]);

} catch (PDOException $e) {
    // Annuler la transaction en cas d'erreur
    $pdo->rollBack();
    error_log("Database error in update-subscription: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error',
        'message' => 'Error updating subscription in database'
    ]);
} catch (Exception $e) {
    error_log("General error in update-subscription: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'message' => 'Internal server error'
    ]);
}
?>
