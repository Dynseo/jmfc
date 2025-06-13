<?php
header('Content-Type: application/json');
require_once '../../config/config.php';

// Vérification de l'authentification
session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Non autorisé']);
    exit;
}

// Récupération des données
$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Données invalides']);
    exit;
}

$transactionId = $data['transactionId'] ?? null;
$productId = $data['productId'] ?? null;
$receipt = $data['receipt'] ?? null;
$platform = $data['platform'] ?? null;
$frequence = $data['frequence'] ?? null;
$montant = $data['montant'] ?? null;

if (!$transactionId || !$productId || !$receipt || !$platform || !$frequence || !$montant) {
    http_response_code(400);
    echo json_encode(['error' => 'Données manquantes']);
    exit;
}

try {
    // Vérification du reçu
    $verificationResult = verifyReceipt($platform, $receipt);
    
    if (!$verificationResult['valid']) {
        http_response_code(400);
        echo json_encode(['error' => 'Reçu invalide']);
        exit;
    }

    // Connexion à la base de données
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Début de la transaction
    $pdo->beginTransaction();

    try {
        // Vérifier si le client existe
        $stmt = $pdo->prepare("SELECT id_client FROM clients WHERE key_name = ?");
        $stmt->execute([$_SESSION['user']['key_name']]);
        $client = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$client) {
            // Créer le client s'il n'existe pas
            $stmt = $pdo->prepare("INSERT INTO clients (key_name, email) VALUES (?, ?)");
            $stmt->execute([$_SESSION['user']['key_name'], $_SESSION['user']['email']]);
            $id_client = $pdo->lastInsertId();
        } else {
            $id_client = $client['id_client'];
        }

        // Déterminer l'ID de la formule en fonction de la fréquence
        $formuleMap = [
            'mensuel' => 1,
            'trimestriel' => 2,
            'semestriel' => 3,
            'annuel' => 4
        ];
        $id_formule = $formuleMap[$frequence] ?? null;

        if (!$id_formule) {
            throw new Exception('Fréquence invalide');
        }

        // Calculer les dates
        $date_debut = date('Y-m-d H:i:s');
        $date_fin = calculateEndDate($date_debut, $frequence);
        $date_prochain_paiement = $date_fin;

        // Enregistrer l'abonnement
        $stmt = $pdo->prepare("
            INSERT INTO abonnements (
                id_client, id_formule, date_debut, date_fin, statut,
                montant, frequence_paiement, methode_paiement,
                renouvellement_auto, date_dernier_paiement, date_prochain_paiement
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $id_client,
            $id_formule,
            $date_debut,
            $date_fin,
            'actif',
            $montant,
            $frequence,
            $platform,
            1, // renouvellement_auto
            $date_debut, // date_dernier_paiement
            $date_prochain_paiement
        ]);

        // Valider la transaction
        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Abonnement enregistré avec succès',
            'date_fin' => $date_fin
        ]);

    } catch (Exception $e) {
        // En cas d'erreur, annuler la transaction
        $pdo->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la vérification de l\'abonnement: ' . $e->getMessage()]);
}

// Fonction pour vérifier les reçus
function verifyReceipt($platform, $receipt) {
    if ($platform === 'ios') {
        // Vérification avec Apple
        $ch = curl_init('https://sandbox.itunes.apple.com/verifyReceipt');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'receipt-data' => $receipt,
            'password' => getenv('APPLE_SHARED_SECRET')
        ]));
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        $result = json_decode($response, true);
        return [
            'valid' => isset($result['status']) && $result['status'] === 0,
            'purchaseDate' => $result['receipt']['purchase_date'] ?? null,
            'expirationDate' => $result['receipt']['expires_date'] ?? null
        ];
    } 
    else if ($platform === 'android') {
        // Vérification avec Google
        $ch = curl_init('https://www.googleapis.com/androidpublisher/v3/applications/com.dynseo.jmfc/purchases/subscriptions/verify');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . getenv('GOOGLE_API_KEY')
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'packageName' => 'com.dynseo.jmfc',
            'subscriptionId' => 'subscription',
            'token' => $receipt
        ]));
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        $result = json_decode($response, true);
        return [
            'valid' => isset($result['valid']) && $result['valid'],
            'purchaseDate' => $result['purchaseTimeMillis'] ?? null,
            'expirationDate' => $result['expiryTimeMillis'] ?? null
        ];
    }
    
    throw new Exception('Plateforme non supportée');
}

// Fonction pour calculer la date de fin
function calculateEndDate($startDate, $frequence) {
    $date = new DateTime($startDate);
    
    switch ($frequence) {
        case 'mensuel':
            $date->modify('+1 month');
            break;
        case 'trimestriel':
            $date->modify('+3 months');
            break;
        case 'semestriel':
            $date->modify('+6 months');
            break;
        case 'annuel':
            $date->modify('+1 year');
            break;
        default:
            throw new Exception('Fréquence invalide');
    }
    
    return $date->format('Y-m-d H:i:s');
} 