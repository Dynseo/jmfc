<?php
header('Content-Type: application/json');

$config = require_once '/var/www/jmfc/config/config.php';

// Log de la notification reçue
error_log('RevenueCat Webhook called - Request Details:');
error_log('Headers: ' . json_encode(getallheaders()));
error_log('Body: ' . file_get_contents('php://input'));

// Vérification de l'autorisation RevenueCat (optionnel mais recommandé)
$headers = getallheaders();
$auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';
$expected_auth = 'Bearer ' . ($config['revenuecat']['webhook_secret'] ?? '');

if ($expected_auth !== 'Bearer ' && $auth_header !== $expected_auth) {
    error_log('RevenueCat webhook: Invalid authorization');
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Lire les données du webhook
$json_data = file_get_contents('php://input');
$data = json_decode($json_data, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host={$config['db']['host']};dbname={$config['db']['name']}",
        $config['db']['user'],
        $config['db']['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $eventType = $data['event']['type'] ?? '';
    $appUserId = $data['event']['app_user_id'] ?? '';
    $productId = $data['event']['product_id'] ?? '';
    
    error_log("RevenueCat event: $eventType for user: $appUserId, product: $productId");

    if (empty($appUserId)) {
        error_log('No app_user_id found in webhook data');
        http_response_code(400);
        echo json_encode(['error' => 'No app_user_id found']);
        exit;
    }

    $pdo->beginTransaction();

    // Vérifier si l'utilisateur existe
    $stmt = $pdo->prepare("SELECT id_client FROM clients WHERE key_name = :username");
    $stmt->execute(['username' => $appUserId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        error_log("User not found: $appUserId");
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    $userId = $user['id_client'];

    // Traiter selon le type d'événement RevenueCat
    switch ($eventType) {
        case 'INITIAL_PURCHASE':
        case 'RENEWAL':
        case 'PRODUCT_CHANGE':
            // Activer/renouveler l'abonnement
            handleActiveSubscription($pdo, $userId, $data);
            break;
            
        case 'CANCELLATION':
            // L'utilisateur a annulé mais l'abonnement reste actif jusqu'à expiration
            handleCancellation($pdo, $userId, $data);
            break;
            
        case 'EXPIRATION':
            // L'abonnement a expiré
            handleExpiration($pdo, $userId, $data);
            break;
            
        case 'BILLING_ISSUE':
            // Problème de facturation - suspendre temporairement
            handleBillingIssue($pdo, $userId, $data);
            break;
            
        case 'SUBSCRIBER_ALIAS':
            // Changement d'ID utilisateur - pas besoin d'action sur l'abonnement
            break;
            
        default:
            error_log("Unhandled RevenueCat event type: $eventType");
            break;
    }

    // Log de l'événement dans une table dédiée
    $stmt = $pdo->prepare("
        INSERT INTO revenuecat_events (
            app_user_id,
            event_type,
            product_id,
            event_data,
            processed_at,
            created_at
        ) VALUES (
            :app_user_id,
            :event_type,
            :product_id,
            :event_data,
            NOW(),
            NOW()
        )
    ");
    
    $stmt->execute([
        'app_user_id' => $appUserId,
        'event_type' => $eventType,
        'product_id' => $productId,
        'event_data' => json_encode($data)
    ]);

    $pdo->commit();

    http_response_code(200);
    echo json_encode(['status' => 'processed']);

} catch (PDOException $e) {
    if (isset($pdo)) $pdo->rollBack();
    error_log("Database error in revenuecat-webhook: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
} catch (Exception $e) {
    error_log("General error in revenuecat-webhook: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}

function handleActiveSubscription($pdo, $userId, $data) {
    $event = $data['event'];
    $productId = $event['product_id'] ?? '';
    $eventTimestamp = $event['event_timestamp_ms'] ?? time() * 1000;
    
    // Déterminer le type d'abonnement basé sur le product_id
    $subscriptionType = getSubscriptionTypeFromProductId($productId);
    $config = require_once '/var/www/jmfc/config/config.php';
    
    // Calculer les dates
    $dateDebut = new DateTime();
    $dateFin = null;
    
    switch ($subscriptionType) {
        case 'monthly':
            $dateFin = (clone $dateDebut)->modify('+1 month');
            $montant = $config['subscription']['monthly_price'] ?? 9.99;
            $frequencePaiement = 'mensuel';
            break;
        case 'yearly':
            $dateFin = (clone $dateDebut)->modify('+1 year');
            $montant = $config['subscription']['yearly_price'] ?? 99.99;
            $frequencePaiement = 'annuel';
            break;
        case 'lifetime':
            $dateFin = null;
            $montant = $config['subscription']['lifetime_price'] ?? 299.99;
            $frequencePaiement = 'annuel';
            break;
        default:
            $montant = 0;
            $frequencePaiement = 'mensuel';
            break;
    }

    // Désactiver les anciens abonnements
    $stmt = $pdo->prepare("
        UPDATE abonnements 
        SET statut = 'suspendu', 
            date_fin = NOW(),
            updated_at = NOW()
        WHERE id_client = :user_id 
            AND statut = 'actif'
    ");
    $stmt->execute(['user_id' => $userId]);

    // Créer le nouvel abonnement
    $stmt = $pdo->prepare("
        INSERT INTO abonnements (
            id_client, 
            id_formule, 
            date_debut, 
            date_fin, 
            statut,
            montant,
            frequence_paiement,
            date_creation,
            date_derniere_modification,
            methode_paiement,
            renouvellement_auto,
            date_dernier_paiement,
            date_prochain_paiement,
            product_id,
            platform,
            subscription_type,
            created_at,
            updated_at
        ) VALUES (
            :user_id, 
            :formule, 
            :date_debut, 
            :date_fin, 
            'actif',
            :montant,
            :frequence_paiement,
            NOW(),
            NOW(),
            'revenuecat',
            1,
            NOW(),
            :date_prochain_paiement,
            :product_id,
            'revenuecat',
            :subscription_type,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'formule' => $config['subscription']['default_formule'] ?? 1,
        'date_debut' => $dateDebut->format('Y-m-d H:i:s'),
        'date_fin' => $dateFin ? $dateFin->format('Y-m-d H:i:s') : null,
        'montant' => $montant,
        'frequence_paiement' => $frequencePaiement,
        'date_prochain_paiement' => $dateFin ? $dateFin->format('Y-m-d H:i:s') : null,
        'product_id' => $productId,
        'subscription_type' => $subscriptionType
    ]);
}

function handleCancellation($pdo, $userId, $data) {
    // L'abonnement reste actif jusqu'à expiration, on met juste à jour le renouvellement
    $stmt = $pdo->prepare("
        UPDATE abonnements 
        SET renouvellement_auto = 0,
            updated_at = NOW()
        WHERE id_client = :user_id 
            AND statut = 'actif'
    ");
    $stmt->execute(['user_id' => $userId]);
}

function handleExpiration($pdo, $userId, $data) {
    // Marquer l'abonnement comme expiré
    $stmt = $pdo->prepare("
        UPDATE abonnements 
        SET statut = 'resilie',
            date_fin = NOW(),
            updated_at = NOW()
        WHERE id_client = :user_id 
            AND statut = 'actif'
    ");
    $stmt->execute(['user_id' => $userId]);
}

function handleBillingIssue($pdo, $userId, $data) {
    // Suspendre temporairement l'abonnement
    $stmt = $pdo->prepare("
        UPDATE abonnements 
        SET statut = 'suspendu',
            updated_at = NOW()
        WHERE id_client = :user_id 
            AND statut = 'actif'
    ");
    $stmt->execute(['user_id' => $userId]);
}

function getSubscriptionTypeFromProductId($productId) {
    // Mapper vos product IDs RevenueCat vers vos types d'abonnement
    $productMapping = [
        'monthly_subscription' => 'monthly',
        'yearly_subscription' => 'yearly',
        'lifetime_subscription' => 'lifetime',
        // Ajoutez vos product IDs ici
    ];
    
    return $productMapping[$productId] ?? 'monthly';
}
?>