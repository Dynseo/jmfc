CREATE TABLE IF NOT EXISTS `formules` (
  `id_formule` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL,
  `duree` int(11) NOT NULL COMMENT 'Durée en jours',
  `frequence` enum('mensuel','trimestriel','semestriel','annuel') NOT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT 1,
  `date_creation` datetime NOT NULL DEFAULT current_timestamp(),
  `date_modification` datetime DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`id_formule`),
  UNIQUE KEY `idx_frequence` (`frequence`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertion des formules de base
INSERT INTO `formules` (`nom`, `description`, `prix`, `duree`, `frequence`, `actif`) VALUES
('Abonnement Mensuel', 'Accès complet à toutes les fonctionnalités pendant 1 mois', 9.99, 30, 'mensuel', 1),
('Abonnement Trimestriel', 'Accès complet à toutes les fonctionnalités pendant 3 mois', 24.99, 90, 'trimestriel', 1),
('Abonnement Semestriel', 'Accès complet à toutes les fonctionnalités pendant 6 mois', 44.99, 180, 'semestriel', 1),
('Abonnement Annuel', 'Accès complet à toutes les fonctionnalités pendant 1 an', 79.99, 365, 'annuel', 1); 