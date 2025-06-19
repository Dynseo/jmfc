<?php
$config = require_once '/var/www/jmfc/config/config.php';

// CORS configuration
if (!empty($config['allowed_origins']) && is_array($config['allowed_origins'])) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $config['allowed_origins'])) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Credentials: true');

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
                    renouvellement_auto
                ) VALUES (
                    :client_id,
                    :formule_id,
                    NOW(),
                    DATE_ADD(NOW(), INTERVAL :trial_days DAY),
                    'actif',
                    0,
                    'mensuel',
                    false
                )
            ");
    
            $stmtAbonnement->execute([
                'client_id' => $clientId,
                'formule_id' => $config['subscription']['default_formule'],
                'trial_days' => $config['subscription']['trial_days']
            ]);
    
            $pdo->commit();

            $checkStmt = $pdo->prepare("
                SELECT c.id_client, a.statut 
                FROM clients c 
                JOIN abonnements a ON c.id_client = a.id_client 
                WHERE c.key_name = :username 
                    AND a.statut = 'actif' 
                    AND a.date_debut <= NOW() 
                    AND (a.date_fin IS NULL OR a.date_fin > NOW())
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
                    'trial_end' => date('Y-m-d', strtotime("+{$config['subscription']['trial_days']} days"))
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
