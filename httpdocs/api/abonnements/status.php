<?php
require_once '../session.php';
header('Content-Type: application/json');

// Vérification de l'authentification
if (!isSessionValid()) {
    http_response_code(401);
    echo json_encode(['error' => 'Non autorisé']);
    exit;
}

$userSession = getUserSession();
if (!$userSession) {
    http_response_code(401);
    echo json_encode(['error' => 'Session invalide']);
    exit;
}

try {
    // Connexion à la base de données
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Récupérer l'abonnement actif le plus récent
    $stmt = $pdo->prepare("
        SELECT a.*, f.nom as formule_nom 
        FROM abonnements a
        JOIN formules f ON a.id_formule = f.id_formule
        WHERE a.id_client = (
            SELECT id_client 
            FROM clients 
            WHERE key_name = ?
        )
        AND a.statut = 'actif'
        AND a.date_fin > NOW()
        ORDER BY a.date_debut DESC
        LIMIT 1
    ");
    
    $stmt->execute([$userSession['key_name']]);
    $abonnement = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$abonnement) {
        echo json_encode([
            'active' => false,
            'subscription' => null
        ]);
        exit;
    }

    echo json_encode([
        'active' => true,
        'subscription' => [
            'date_debut' => $abonnement['date_debut'],
            'date_fin' => $abonnement['date_fin'],
            'formule' => $abonnement['formule_nom'],
            'frequence' => $abonnement['frequence_paiement']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la vérification du statut: ' . $e->getMessage()]);
} 