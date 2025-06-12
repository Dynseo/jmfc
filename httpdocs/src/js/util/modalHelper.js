import $ from '../externals/jquery.js';
import { i18nService } from '../service/i18nService';

export const modalHelper = {
    showModal(title, message, options = {}) {
        // Supprimer les modales existantes
        $('.simple-modal').remove();
        
        // Créer le HTML de la modale
        const modalHtml = `
            <div class="simple-modal" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center;">
                <div style="background:var(--col-bck); padding:20px; border-radius:20px; max-width:400px; width:100%;">
                    <div>
                    <h3 style="margin-top:0;display:inline-block;">${title}</h3>
                    <button class="close-btn" style="float:right;">${i18nService.t('cancel')}</button> 
                    </div>
                    <p>${message}</p>
                    <div style="text-align:center; margin-top:20px;">
                        ${options.showRegister ? `<button class="register-btn" style="margin-right:10px;">${i18nService.t('createAccount')}</button>` : ''} 
                        ${options.showLogin ? `<button class="login-btn" style="margin-right:10px;">${i18nService.t('toLogin')}</button>` : ''} 
                    </div>
                </div>
            </div>
        `;
        
        // Ajouter la modale au body
        $('body').append(modalHtml);
        
        // Gérer les événements
        $('.simple-modal .close-btn').on('click', function() {
            $('.simple-modal').remove();
        });
        
        if (options.showLogin) {
            $('.simple-modal .login-btn').on('click', function() {
                $('.simple-modal').remove();
                if (options.onLogin) options.onLogin();
            });
        }
        
        if (options.showRegister) {
            $('.simple-modal .register-btn').on('click', function() {
                $('.simple-modal').remove();
                if (options.onRegister) options.onRegister();
            });
        }
    }
};