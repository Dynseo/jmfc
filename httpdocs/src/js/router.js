import $ from './externals/jquery.js';
import Navigo from 'navigo';

import { i18nService } from './service/i18nService';
import { dataService } from './service/data/dataService.js';
import { helpService } from './service/helpService';
import { handlePaywallIfNeeded, checkSubscription, initializeRevenueCatForUser, presentPaywall } from './service/paymentService.js';
import { loginService } from './service/loginService.js';

import AllGridsView from '../vue-components/views/allGridsView.vue';
import GridEditView from '../vue-components/views/gridEditView.vue';
import GridView from '../vue-components/views/gridView.vue';
import LoginView from '../vue-components/views/loginView.vue';
import RegisterView from '../vue-components/views/registerView.vue';
import WelcomeView from '../vue-components/views/welcomeView.vue';
import AboutView from '../vue-components/views/aboutView.vue';
import SettingsView from '../vue-components/views/settingsView.vue';
import SubscriptionRequiredView from '../vue-components/views/subscriptionRequiredView.vue';
import { databaseService } from './service/data/databaseService';
import { localStorageService } from './service/data/localStorageService';
import { MainVue } from './vue/mainVue';
import HelpView from '../vue-components/views/helpView.vue';
// import LogView from '../vue-components/views/logView.vue';
import { constants } from './util/constants.js';
import { urlParamService } from './service/urlParamService';
import { guardNavigation } from './navigationGuard.js';

let NO_DB_VIEWS = ['#login', '#register', '#welcome', '#add', '#about', '#help', '#outdated', '#subscription'];

let Router = {};
let navigoInstance = null;
let injectId = null;
let lastHash = null;
let routingEndabled = true;
let _initialized = false;
let _currentView = null;
let _currentVueApp = null;
let _gridHistory = [];
let _locked = false;

Router.VIEWS = {
    AllGridsView: AllGridsView,
    GridView: GridView,
    GridEditView: GridEditView,
    // LogView: LogView
}

Router.init = function (injectIdParam, initialHash) {
    if (!routingEndabled) {
        return;
    }
    _initialized = true;
    injectId = injectIdParam;
    navigoInstance = new Navigo(null, true);
    navigoInstance.on({
        main: function () {
            helpService.setHelpLocation('', '#main');
            //helpService.setHelpLocation('02_navigation', '#main-view');
            toMainInternal();
        },
        'grids/': function () {
            helpService.setHelpLocation('', '#main');
            //helpService.setHelpLocation('02_navigation', '#manage-grids-view');
            loadVueView(AllGridsView);
        },
        'grid/:gridId': function (params, query) {
            log.debug('route grid with ID: ' + params.gridId);
            let passParams = urlParamService.getSearchQueryParams(params);
            helpService.setHelpLocation('', '#main');
            //helpService.setHelpLocation('02_navigation', '#main-view');
            loadVueView(GridView, passParams, '#main');
        },
        'grid/name/:gridName': function (params) {
            log.debug('route grid with Name: ' + params.gridName);
            helpService.setHelpLocation('', '#main');
            //helpService.setHelpLocation('02_navigation', '#main-view');
            dataService.getGrids().then((result) => {
                let gridsWithName = result.filter((grid) => i18nService.getTranslation(grid.label) === params.gridName);
                let id = gridsWithName[0] ? gridsWithName[0].id : null;
                if (id) {
                    loadVueView(
                        GridView,
                        {
                            gridId: id
                        },
                        '#main'
                    );
                } else {
                    log.warn(`no grid with name ${params.gridName} found!`);
                    toMainInternal();
                }
            });
        },
        'grid/edit/:gridId': function (params) {
            helpService.setHelpLocation('', '#main');
            //helpService.setHelpLocation('02_navigation', '#edit-view');
            loadVueView(GridEditView, params);
        },
        'grid/edit/:gridId/:highlightId': function (params) {
            helpService.setHelpLocation('', '#main');
            //helpService.setHelpLocation('02_navigation', '#edit-view');
            loadVueView(GridEditView, params);
        },
        login: function () {
            helpService.setHelpLocation('', '#main');
            //helpService.setHelpLocation('02_navigation', '#change-user-view');
            loadVueView(LoginView);
        },
        register: function () {
            helpService.setHelpLocation('', '#main');
            //helpService.setHelpLocation('06_users', '#online-users');
            loadVueView(RegisterView);
        },
        subscription: function () {
            helpService.setHelpLocation('', '#main');
            loadVueView(SubscriptionRequiredView);
        },
        welcome: function () {
            helpService.setHelpLocationIndex();
            loadVueView(WelcomeView);
        },
        about: function () {
            helpService.setHelpLocationIndex();
            loadVueView(AboutView);
        },
        settings: function () {
            //TODO add correct help location
            loadVueView(SettingsView);
        },
        help: function () {
            loadVueView(HelpView);
        },
        // logs: () => {
        //     loadVueView(LogView);
        // },
        '*': function () {
            helpService.setHelpLocation('main', '');
            //**helpService.setHelpLocation('02_navigation', '#main-view');
            Router.toMain();
        }
    });
    navigoInstance.hooks({
        before: function (done, params) {
            let hash = location.hash;
            $(document).trigger(constants.EVENT_NAVIGATE);
            let validForLocked =
                !hash.startsWith('#grid/edit') && (hash.startsWith('#main') || hash.startsWith('#grid/'));
            if (_locked && !validForLocked) {
                done(constants.IS_SAFARI ? undefined : false);
                if (constants.IS_SAFARI) {
                    return setTimeout(() => {
                        Router.toMain();
                    }, 100);
                }
                return Router.toMain();
            }
            // Vérification des droits d'accès
            if (!guardNavigation(hash)) {
                done(false);
                return Router.toMain();
            }
            
            
            if (_currentView && _currentView.destroy) {
                _currentView.destroy();
                _currentView = null;
            }
            if (_currentVueApp) {
                _currentVueApp.$destroy();
            }
            let validHash = getValidHash();
            if (location.hash !== validHash) {
                done(false);
                Router.to(validHash);
            } else {
                done();
            }
        },
        after: function (params) {
            //log.debug('after');
        },
        leave: function (params) {
            //log.debug('leave');
        }
    });
    if (initialHash) {
        Router.to(initialHash);
    }
    navigoInstance.resolve();
};

/**
 * returns false if Router.init() wasn't called before, otherwise true
 * @return {boolean}
 */
Router.isInitialized = function () {
    return _initialized;
};

/**
 * navigate to the given hash
 * @param hash the hash to navigate to, e.g. '#main'
 * @param options.reset if true, the last hash isn't stored for "back" navigation purposes
 * @param options.noHistory if true, the last hash isn't stored for "back" navigation purposes
 */
Router.to = function (hash, options) {
    options = options || {};
    lastHash = options.reset ? null : location.hash;
    let url = getFullUrl(hash);
    if (options.noHistory) {
        location.replace(url);
    } else {
        location.assign(url);
    }
};

Router.toMain = function () {
    Router.to('#main' + '?date=' + new Date().getTime());
};

Router.toRegister = function () {
    Router.to('#register');
};

Router.toSubscription = function () {
    Router.to('#subscription');
};

/*Router.toAddOffline = function () {
    Router.to('#add');
};*/

Router.toAbout = function () {
    Router.to('#about');
};

Router.toLogin = function () {
    Router.to('#login');
};

Router.toSettings = function () {
    Router.to('#settings');
};

Router.toLogs = function () {
    Router.to('#logs');
};

Router.toLastOpenedGrid = function () {
    dataService.getMetadata().then((metadata) => {
        Router.toGrid(metadata.lastOpenedGridId);
    });
};

Router.toGrid = function (id, props) {
    if (id) {
        Router.addToGridHistory(id);
        props = props || {};
        urlParamService.setParamsToSearchQuery(props);
        let hash = `#grid/${id}`;

        if (_currentView === GridView) {
            dataService.getGrid(id).then((gridData) => {
                if (!gridData) {
                    return;
                }
                if (history && history.replaceState) {
                    history.replaceState(null, null, getFullUrl(`#grid/${id}`));
                }
                $(document).trigger(constants.EVENT_NAVIGATE_GRID_IN_VIEWMODE, [gridData, props]);
            });
        } else {
            let noHistory = location.hash.startsWith('#main');
            Router.to(hash, { noHistory: noHistory });
        }
    }
};

Router.toEditGrid = async function(id, highlightId) {
    if (!id) {
        let grids = await dataService.getGrids(false, true);
        id = grids.length > 0 ? grids[0].id : null;
    }
    if (id) {
        Router.to(`#grid/edit/${id}/${highlightId ? highlightId : ''}`);
    }
};

Router.toManageGrids = function () {
    Router.to('#grids');
};

Router.back = function () {
    if (lastHash && lastHash !== location.hash) {
        Router.to(lastHash, { reset: true });
    } else {
        this.toMain();
    }
};

Router.isOnEditPage = function () {
    return window.location.hash.indexOf('#grid/edit') !== -1;
};

Router.getCurrentView = function () {
    return _currentView;
};

Router.addToGridHistory = function (gridId) {
    if (_gridHistory.length > 0 && _gridHistory[_gridHistory.length - 1] === gridId) {
        return;
    }
    if (_gridHistory.indexOf(gridId) !== -1) {
        _gridHistory = [gridId];
        return;
    }
    _gridHistory.push(gridId);
};

Router.toLastGrid = function () {
    if (_gridHistory.length === 1) {
        return;
    }
    _gridHistory.pop(); // remove current grid
    let toId = _gridHistory.pop();
    Router.toGrid(toId);
};

function getValidHash() {
    let hashToUse = location.hash;
    if (!databaseService.getCurrentUsedDatabase()) {
        let toLogin = localStorageService.getLastActiveUser() || localStorageService.getSavedUsers().length > 0;
        hashToUse = NO_DB_VIEWS.includes(hashToUse) ? hashToUse : null;
        hashToUse = hashToUse || (toLogin ? '#login' : '#welcome');
    }
    return hashToUse;
}

function getHash() {
    let hash = location.hash;
    let index = hash.lastIndexOf('/');
    index = index > -1 ? index : hash.length;
    return hash.substring(0, index);
}

function getFullUrl(hash) {
    return location.origin + location.pathname + location.search + hash;
}

function loadVueView(viewObject, properties, menuItemToHighlight) {
    if (!routingEndabled) {
        return;
    }

    _currentView = viewObject;
    if (viewObject !== GridView) {
        $('#touchElement').hide();
    }

    setMenuItemSelected(menuItemToHighlight || getHash());
    log.debug('loading view: ' + viewObject.__file);
    MainVue.setViewComponent(viewObject, properties);
}

function setMenuItemSelected(hash) {
    $('nav button').removeClass('selected');
    $(`nav a[href='${hash}'] button`).addClass('selected');
}

function toMainInternal() {
    if (!routingEndabled) {
        return;
    }
    
    // Vérifier d'abord si l'utilisateur a un abonnement actif
    checkSubscriptionAndBlockIfNeeded().then(hasActiveSubscription => {
        if (!hasActiveSubscription) {
            // Bloquer l'accès à l'application et forcer le paywall
            return;
        }
        
        // Si abonnement actif, continuer normalement
        dataService.getMetadata().then((metadata) => {
            let gridId = metadata ? metadata.homeGridId || metadata.lastOpenedGridId : null;
            if (gridId) {
                return Router.toGrid(gridId);
            }
            
            // Pour les nouveaux utilisateurs, vérifier s'il y a des grilles disponibles
            dataService.getGrids().then((grids) => {
                if (grids && grids.length > 0) {
                    // Utiliser la première grille disponible comme grille par défaut
                    const defaultGrid = grids[0];
                    log.info('Using default grid for new user:', defaultGrid.id);
                    
                    // Sauvegarder cette grille comme grille d'accueil pour les prochaines fois
                    dataService.updateMetadata({ homeGridId: defaultGrid.id });
                    
                    return Router.toGrid(defaultGrid.id);
                } else {
                    // Aucune grille disponible, charger la grille par défaut depuis live_metadata.json
                    log.info('No grids available, loading default grid from live_metadata.json');
                    loadDefaultGridForNewUser();
                }
            }).catch((error) => {
                log.error('Error loading grids for new user:', error);
                loadDefaultGridForNewUser();
            });
        });
    }).catch(error => {
        log.error('Error checking subscription:', error);
        // En cas d'erreur, rediriger vers login
        Router.toLogin();
    });
}

async function checkSubscriptionAndBlockIfNeeded() {
    const currentUser = localStorageService.getLastActiveUser();
    if (!currentUser) {
        log.info('No user logged in, redirecting to login');
        Router.toLogin();
        return false;
    }
    
    try {
        const hasActiveSubscription = await checkSubscription(currentUser);
        if (!hasActiveSubscription) {
            log.info('No active subscription, redirecting to subscription page');
            Router.toSubscription();
            return false;
        }
        
        log.info('Active subscription found, allowing access');
        return true;
    } catch (error) {
        log.error('Error checking subscription:', error);
        // En cas d'erreur, rediriger vers la page d'abonnement par sécurité
        Router.toSubscription();
        return false;
    }
}

function showBlockingPaywall() {
    // Créer une vue de paywall bloquante
    const paywallOverlay = document.createElement('div');
    paywallOverlay.id = 'blocking-paywall-overlay';
    paywallOverlay.innerHTML = `
        <div class="blocking-paywall-outer">
            <div class="blocking-paywall-inner">
                <h2>Abonnement requis</h2>
                <p>Vous devez avoir un abonnement actif pour accéder à l'application.</p>
                <button id="show-paywall-btn" class="paywall-btn primary">Voir les offres</button>
                <button id="logout-btn" class="paywall-btn secondary">Se déconnecter</button>
            </div>
        </div>
    `;

    // Ajout du style responsive pour overlay et centré (vertical/horizontal)
    const style = document.createElement('style');
    style.textContent = `
        #blocking-paywall-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .blocking-paywall-outer {
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .blocking-paywall-inner {
            text-align: center;
            padding: 40px 20px;
            background: rgba(51, 51, 51, 0.95);
            border-radius: 20px;
            max-width: 400px;
            width: 90vw;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            border: 1px solid rgba(255,255,255,0.18);
        }
        .blocking-paywall-inner h2 {
            font-size: 2rem;
            margin-bottom: 20px;
            font-weight: 300;
        }
        .blocking-paywall-inner p {
            font-size: 1.1rem;
            margin-bottom: 30px;
            opacity: 0.9;
            line-height: 1.5;
        }
        .paywall-btn {
            padding: 12px 24px;
            margin: 10px;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
        }
        .paywall-btn.primary {
            background: #007bff;
            color: white;
        }
        .paywall-btn.primary:hover {
            background: #0056b3;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
        }
        .paywall-btn.secondary {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .paywall-btn.secondary:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
        @media (max-width: 600px) {
            .blocking-paywall-inner {
                padding: 20px 5px;
                max-width: 95vw;
            }
            .paywall-btn {
                width: 100%;
                margin: 10px 0;
            }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(paywallOverlay);

    // Gérer les clics
    document.getElementById('show-paywall-btn').addEventListener('click', async () => {
        try {
            const success = await presentPaywall();
            if (success) {
                // L'utilisateur a souscrit, recharger la page
                document.body.removeChild(paywallOverlay);
                if (style.parentNode) style.parentNode.removeChild(style);
                location.reload();
            }
        } catch (error) {
            log.error('Error showing paywall:', error);
        }
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        loginService.logout();
        document.body.removeChild(paywallOverlay);
        if (style.parentNode) style.parentNode.removeChild(style);
        Router.toLogin();
    });
}

async function loadDefaultGridForNewUser() {
    try {
        // Charger la grille par défaut directement depuis l'URL
        const defaultGridUrl = 'build/grd_base/default.grd.json';
        log.info('Loading default grid from URL:', defaultGridUrl);
        
        // Charger directement le fichier JSON
        const response = await fetch(defaultGridUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const gridData = await response.json();
        log.info('Default grid file loaded successfully');
        
        // Importer les données directement
        await dataService.importBackupData(gridData, { 
            skipDelete: true, 
            filename: 'default.grd.json' 
        });
        
        // Après import, récupérer les grilles et rediriger vers la première
        const grids = await dataService.getGrids();
        if (grids && grids.length > 0) {
            const defaultGrid = grids[0];
            log.info('Default grid loaded successfully, redirecting to:', defaultGrid.id);
            
            // Sauvegarder cette grille comme grille d'accueil
            await dataService.updateMetadata({ homeGridId: defaultGrid.id });
            
            Router.toGrid(defaultGrid.id);
        } else {
            log.warn('Failed to load default grid, showing grid management view');
            loadVueView(GridView);
        }
    } catch (error) {
        log.error('Error loading default grid for new user:', error);
        // En cas d'erreur, montrer la vue de gestion des grilles
        loadVueView(GridView);
    }
}

$(document).on(constants.EVENT_UI_LOCKED, () => {
    _locked = true;
});

$(document).on(constants.EVENT_UI_UNLOCKED, () => {
    _locked = false;
});

export { Router };
