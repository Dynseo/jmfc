import { loginService } from './service/loginService.js';
import { Router } from './router.js';
import { modalHelper } from './util/modalHelper.js';
import { i18nService } from './service/i18nService';

const PROTECTED_ROUTES = ['#grids', '#grid/edit'];

/**
 * Vérifie si l'utilisateur est autorisé à accéder à la route demandée
 * 
 * @param {string} hash - Le hash de la route demandée
 * @returns {boolean} - true si l'utilisateur peut accéder, false sinon
 */
function canAccessRoute(hash) {
    const username = loginService.getLoggedInUsername();
    
    // Si l'utilisateur est "default-user", vérifier s'il essaie d'accéder à une route protégée
    if (username === "default-user") {
        return !PROTECTED_ROUTES.some(route => hash.startsWith(route));
    }
    
    // Tous les autres utilisateurs ont accès complet
    return true;
}

/**
 * Affiche un message d'erreur
 */
function showLoginRequiredMessage() {
    modalHelper.showModal(
        i18nService.t('restrictedAccess'),
        i18nService.t('thisFeaturerequiresAUserAccount'),
        {
            showLogin: true,
            onLogin: () => Router.toLogin(),
            showRegister: true,
            onRegister: () => Router.toRegister(),
        }
    );
}

/**
 * Intercepte une navigation et vérifie les droits d'accès
 * 
 * @param {string} hash - Le hash de destination
 * @returns {boolean} - true si la navigation doit continuer, false sinon
 */
function guardNavigation(hash) {
    if (!canAccessRoute(hash)) {
        showLoginRequiredMessage();
        return false;
    }
    return true;
}

export { guardNavigation, canAccessRoute };