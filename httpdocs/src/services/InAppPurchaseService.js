import { InAppPurchase } from 'cordova-plugin-inapppurchase';

class InAppPurchaseService {
    constructor() {
        this.products = {
            mensuel: {
                id: 'com.dynseo.jmfc.subscription.mensuel',
                type: 'paid subscription'
            },
            trimestriel: {
                id: 'com.dynseo.jmfc.subscription.trimestriel',
                type: 'paid subscription'
            },
            semestriel: {
                id: 'com.dynseo.jmfc.subscription.semestriel',
                type: 'paid subscription'
            },
            annuel: {
                id: 'com.dynseo.jmfc.subscription.annuel',
                type: 'paid subscription'
            }
        };
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Vérifier si nous sommes dans un environnement mobile
            if (!window.cordova) {
                console.log('Environnement non-mobile détecté, les achats in-app ne sont pas disponibles');
                return false;
            }

            // Attendre que le plugin soit disponible
            await this.waitForPlugin();
            
            // Initialiser le plugin
            await window.cordova.plugins.InAppPurchase.init();
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des achats in-app:', error);
            return false;
        }
    }

    waitForPlugin() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 10;
            const interval = 500; // 500ms entre chaque tentative

            const checkPlugin = () => {
                if (window.cordova && window.cordova.plugins && window.cordova.plugins.InAppPurchase) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Plugin InAppPurchase non disponible après plusieurs tentatives'));
                } else {
                    attempts++;
                    setTimeout(checkPlugin, interval);
                }
            };

            checkPlugin();
        });
    }

    async getProducts() {
        if (!this.isInitialized) {
            throw new Error('Le service d\'achat in-app n\'est pas initialisé');
        }

        try {
            const productIds = Object.values(this.products).map(p => p.id);
            const products = await window.cordova.plugins.InAppPurchase.getProducts(productIds);
            return products;
        } catch (error) {
            console.error('Erreur lors de la récupération des produits:', error);
            throw error;
        }
    }

    async purchaseSubscription(frequence) {
        if (!this.isInitialized) {
            throw new Error('Le service d\'achat in-app n\'est pas initialisé');
        }

        try {
            const productId = this.products[frequence]?.id;
            if (!productId) {
                throw new Error('Fréquence d\'abonnement invalide');
            }

            const purchase = await window.cordova.plugins.InAppPurchase.order(productId);
            
            if (purchase && purchase.transaction) {
                await this.verifyPurchase(purchase, frequence);
                return purchase;
            }
            throw new Error('Achat non validé');
        } catch (error) {
            console.error('Erreur lors de l\'achat:', error);
            throw error;
        }
    }

    async verifyPurchase(purchase, frequence) {
        try {
            const response = await fetch('/api/abonnements/verify.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionId: purchase.transaction.id,
                    productId: purchase.productId,
                    receipt: purchase.transaction.receipt,
                    platform: this.getPlatform(),
                    frequence: frequence,
                    montant: purchase.price
                })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la vérification de l\'achat');
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'achat:', error);
            throw error;
        }
    }

    getPlatform() {
        if (window.cordova && window.cordova.platformId) {
            return window.cordova.platformId;
        }
        return 'unknown';
    }
}

export default new InAppPurchaseService(); 