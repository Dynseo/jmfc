import { loginService } from './service/loginService.js';
import { Router } from './router.js';
import { modalHelper } from './util/modalHelper.js';
import { i18nService } from './service/i18nService';

const PROTECTED_ROUTES = ['#grids', '#grid/edit'];
const ADMIN_ONLY_ROUTES = ['#admin/library'];

/**
 * Vérifie si l'utilisateur est autorisé à accéder à la route demandée
 * 
 * @param {string} hash - Le hash de la route demandée
 * @returns {boolean} - true si l'utilisateur peut accéder, false sinon
 */
function matchesRoute(hash, route) {
    return hash === route || hash.startsWith(route + '/') || hash.startsWith(route + '?');
}

function canAccessRoute(hash) {
    const username = loginService.getLoggedInUsername();

    // if (!username) {
    //     return false;
    // }

    if (username === 'default-user') {
        return !PROTECTED_ROUTES.some(route => hash.startsWith(route));
    }

    if (ADMIN_ONLY_ROUTES.some(route => matchesRoute(hash, route))) {
        return loginService.isAdmin();
    }

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

function showAdminRequiredMessage() {
    modalHelper.showModal(
        i18nService.t('restrictedAccess'),
        i18nService.t('administratorPrivilegesRequired'),
        {
            showLogin: false,
            showRegister: false
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
    const username = loginService.getLoggedInUsername();

    // if (!username) {
    //     showLoginRequiredMessage();
    //     return false;
    // }

    if (username === 'default-user' && !canAccessRoute(hash)) {
        showLoginRequiredMessage();
        return false;
    }

    if (ADMIN_ONLY_ROUTES.some(route => matchesRoute(hash, route)) && !loginService.isAdmin()) {
        showAdminRequiredMessage();
        return false;
    }

    if (!canAccessRoute(hash)) {
        showLoginRequiredMessage();
        return false;
    }

    return true;
}

export { guardNavigation, canAccessRoute };