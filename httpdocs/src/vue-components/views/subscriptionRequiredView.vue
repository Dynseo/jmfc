<template>
    <div id="subscriptionRequiredView" class="subscription-required-view">
        <div class="container">
            <div class="subscription-required-content">
                <div class="icon">
                    <i class="fas fa-lock" aria-hidden="true"></i>
                </div>
                
                <h1>{{ $t('subscriptionRequired') }}</h1>
                <p>{{ $t('subscriptionRequiredMessage') }}</p>
                
                <div class="actions">
                    <button @click="showPaywall" class="btn btn-primary btn-lg">
                        <i class="fas fa-shopping-cart" aria-hidden="true"></i>
                        {{ $t('viewSubscriptionPlans') }}
                    </button>
                    
                    <button @click="logout" class="btn btn-secondary">
                        <i class="fas fa-sign-out-alt" aria-hidden="true"></i>
                        {{ $t('logout') }}
                    </button>
                </div>
                
                <div class="loading" v-if="loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    {{ $t('processing') }}
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { presentPaywall, initializeRevenueCatForUser } from '../../js/service/paymentService.js';
import { loginService } from '../../js/service/loginService.js';
import { Router } from '../../js/router.js';

export default {
    name: 'SubscriptionRequiredView',
    data() {
        return {
            loading: false
        }
    },
    methods: {
        async showPaywall() {
            this.loading = true;
            try {
                // S'assurer que l'utilisateur est identifié dans RevenueCat
                await initializeRevenueCatForUser();
                
                // Afficher le paywall
                const success = await presentPaywall();
                if (success) {
                    // L'utilisateur a souscrit, recharger l'application
                    console.log('Subscription successful, reloading...');
                    location.reload();
                } else {
                    console.log('Paywall dismissed or cancelled');
                }
            } catch (error) {
                console.error('Error showing paywall:', error);
                alert('Erreur lors de l\'affichage des offres. Veuillez réessayer.');
            } finally {
                this.loading = false;
            }
        },
        
        logout() {
            loginService.logout();
            Router.toLogin();
        }
    },
    mounted() {
        // Initialiser RevenueCat à l'affichage de la vue
        initializeRevenueCatForUser().catch(error => {
            console.warn('Failed to initialize RevenueCat:', error);
        });
    }
}
</script>

<style scoped>
.subscription-required-view {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.container {
    max-width: 500px;
    padding: 20px;
}

.subscription-required-content {
    text-align: center;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: 40px;
    border-radius: 20px;
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    border: 1px solid rgba(255, 255, 255, 0.18);
}

.icon {
    font-size: 4rem;
    margin-bottom: 20px;
    opacity: 0.8;
}

h1 {
    font-size: 2rem;
    margin-bottom: 20px;
    font-weight: 300;
}

p {
    font-size: 1.1rem;
    margin-bottom: 30px;
    opacity: 0.9;
    line-height: 1.5;
}

.actions {
    margin-bottom: 20px;
}

.btn {
    padding: 12px 24px;
    margin: 10px;
    border: none;
    border-radius: 25px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
}

.btn-primary {
    background: #007bff;
    color: white;
}

.btn-primary:hover {
    background: #0056b3;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.btn-secondary {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateY(-2px);
}

.btn-lg {
    padding: 15px 30px;
    font-size: 1.1rem;
}

.loading {
    margin-top: 20px;
    opacity: 0.8;
}

.fa-spin {
    margin-right: 8px;
}

@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    .subscription-required-content {
        padding: 20px;
    }
    
    h1 {
        font-size: 1.5rem;
    }
    
    .btn {
        display: block;
        width: 100%;
        margin: 10px 0;
    }
}
</style>
