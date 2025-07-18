<?php
error_log("Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'none'));
error_log("Request Method: " . $_SERVER['REQUEST_METHOD']);

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

// ... headers CORS déjà envoyés ici ...
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $email = $data['email'] ?? '';

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
            // insert user
            $stmtClient = $pdo->prepare("
                INSERT INTO clients (key_name, email, date_inscription, opt_in_marketing)
                VALUES (:username, :email, NOW(), false)
            ");
            
            $stmtClient->execute([
                'username' => $username,
                'email' => $email
            ]);
            
            $clientId = $pdo->lastInsertId();
    
            // insert subscription
            $stmtAbonnement = $pdo->prepare("
                INSERT INTO abonnements (
                    id_client, 
                    id_formule,
                    date_debut,
                    date_fin,
                    statut,
                    montant,
                    frequence_paiement,
                    renouvellement_auto,
                    methode_paiement,
                    subscription_type,
                    platform,
                    created_at,
                    updated_at
                ) VALUES (
                    :client_id,
                    :formule_id,
                    NOW(),
                    DATE_ADD(NOW(), INTERVAL :trial_days DAY),
                    'actif',
                    0,
                    'mensuel',
                    false,
                    'trial',
                    'trial',
                    'web',
                    NOW(),
                    NOW()
                )
            ");
    
            $stmtAbonnement->execute([
                'client_id' => $clientId,
                'formule_id' => $config['subscription']['default_formule'],
                'trial_days' => $config['subscription']['trial_days']
            ]);
    
            $pdo->commit();

            $checkStmt = $pdo->prepare("
                SELECT c.id_client, a.statut, a.subscription_type, a.date_debut, a.date_fin, a.montant
                FROM clients c 
                JOIN abonnements a ON c.id_client = a.id_client 
                WHERE c.key_name = :username 
                    AND a.statut = 'actif' 
                    AND a.date_debut <= NOW() 
                    AND (a.date_fin IS NULL OR a.date_fin > NOW())
                ORDER BY a.date_debut DESC
                LIMIT 1
            ");
            
            $checkStmt->execute(['username' => $username]);
            $checkResult = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            error_log("New user registration check - Username: $username, Found: " . ($checkResult ? 'Yes' : 'No'));
            
            echo json_encode([
                'success' => true,
                'message' => 'User registered successfully',
                'data' => [
                    'client_id' => $clientId,
                    'subscription_active' => !empty($checkResult),
                    'subscription_type' => $checkResult ? $checkResult['subscription_type'] : null,
                    'is_trial' => $checkResult ? floatval($checkResult['montant']) === 0.0 : false,
                    'trial_end' => date('Y-m-d', strtotime("+{$config['subscription']['trial_days']} days")),
                    'date_debut' => $checkResult ? $checkResult['date_debut'] : null,
                    'date_fin' => $checkResult ? $checkResult['date_fin'] : null
                ]
            ]);
    
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    
    } catch (Exception $e) {
        error_log("Registration error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Registration failed',
            'message' => $e->getMessage()
        ]);
    }
    ?>
