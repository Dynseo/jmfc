<template>
    <div class="overflow-content">
        <header-icon full-header="true"></header-icon>
        
        <!-- Pop-up component -->
        <transition name="fade">
            <div v-if="showPopup" class="popup-overlay" @click="closePopupByOutsideClick">
                <div class="popup-container" @click.stop>
                    <div class="popup-content">
                        <button class="popup-close" @click="closePopup">×</button>
                        <div class="popup-navigation">
                            <button class="nav-arrow left" @click="prevPopup" :disabled="currentPopupIndex === 0">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            
                            <div class="popup-slides-wrapper">
                                <transition name="slide">
                                    <div v-if="currentPopupIndex === 0" key="slide1" class="popup-slide">
                                        <h3>{{ $t('welcomeToTheApp')}}</h3>
                                        <h2 class="alignCenter">{{ $t('jmfc') }}</h2>
                                        <p>{{ $t('yourNewACCapp')}}</p>
                                        <img src="https://www.jemefaiscomprendre.com/images-all/logo-jmfc.svg" alt="logo Je me fais comprendre">
                                    </div>
                                    
                                    <div v-else-if="currentPopupIndex === 1" key="slide2" class="popup-slide">
                                        <h3>{{ $t('Presentation')}}</h3>
                                        <p class="welcome-p">
                                            {{ $t('iAmADAD01')}}<br><br>
                                            {{ $t('iAmADAD02')}}<br><br>
                                            {{ $t('iAmADAD03')}}<br>
                                            {{ $t('iAmADAD04')}}<br>
                                            {{ $t('iAmADAD05')}}<br><br>
                                            {{ $t('iAmADAD06')}}<br>
                                            {{ $t('iAmADAD07')}}<br><br>
                                            {{ $t('iAmADAD08')}}<br>
                                        </p>
                                    </div>
                                    
                                    <div v-else-if="currentPopupIndex === 2" key="slide3" class="popup-slide">
                                        <h3>Instrusctions & documentation</h3>
                                        <p class="welcome-p">
                                         <div class="video-container">
                                            <iframe
                                                id="youtubePlayer"
                                                width="560"
                                                height="315"
                                                src="https://www.youtube.com/embed/pxiGYnl4GZw?enablejsapi=1"
                                                title="YouTube video player"
                                                frameborder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowfullscreen>
                                            </iframe>
                                        </div>
                                        </p>
                                    </div>
                                </transition>
                            </div>
                            
                            <button class="nav-arrow right" @click="nextPopup" :disabled="currentPopupIndex === popupTotal - 1">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        
                        <div class="popup-indicators">
                            <span 
                                v-for="index in popupTotal" 
                                :key="index" 
                                :class="{'active': currentPopupIndex === index - 1}"
                                @click="goToPopup(index - 1)">
                            </span>
                        </div>
                        
                        <div class="popup-footer">
                            <label class="do-not-show-again">
                                <input type="checkbox" v-model="doNotShowAgain">
                                {{ $t('doNotShowAgain')}}
                            </label>
                            <span>
                                <a class="button blue small" :href="'https://www.jemefaiscomprendre.com/' + $t('langApp') + '/doc'">{{ $t('ToSeeDocumentation')}}</a>&nbsp;&nbsp;&nbsp;
                                <a class="button blue small" href="https://www.youtube.com/channel/UCSNYV9jTr3IS1m8eiG8nv_w">{{ $t('ToWatchOurYoutubeChannel')}}</a>
                            </span>
                            <button class="popup-start-button" 
                                    @click="closePopup"
                                    :style="{ opacity: currentPopupIndex === popupTotal - 1 ? 1 : 0, 
                                            pointerEvents: currentPopupIndex === popupTotal - 1 ? 'auto' : 'none' }">
                                {{ $t('startNow')}}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
        
        <div class="container">
            <div class="row ps-2 ps-sm-3 ps-md-4 col-12 col-md-10 col-xl-8">
                <h2 class="alignCenter">{{ $t('jmfc') }}</h2>
                <div>
                    <h3>
                        <template>
                            <strong>{{ $t('iHaveAnAccount') }}</strong>
                        </template>
                    </h3>
                    <div class="row">
                        <div class="col-12">
                            <button class="big-button col-12" @click="toLogin()">
                                <i class="fas fa-user me-2"></i>
                                {{ $t('toLogin') }}
                            </button>
                        </div>
                    </div>
                </div>
                <div class="mt-4">
                    <h3>
                        <strong>{{ $t('iDoNotHaveAnAccount') }}</strong>
                    </h3>
                    <div class="row">
                        <div class="col-12">
                            <button class="big-button col-12" @click="toRegister()">
                                <i class="fas fa-user-plus me-2"></i>
                                {{ $t('registerNow') }}
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Section Abonnement -->
                <div class="mt-5">
                    <h3>
                        <strong>{{ $t('subscription.title') }}</strong>
                    </h3>
                    <div class="row">
                        <div class="col-12">
                            <subscription-manager 
                                @subscription-updated="handleSubscriptionUpdate"
                                class="subscription-section"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!--<div class="info_bottom">
            <b>{{ $t('hint') }}</b>
            <i18n path="ifYouNeedHelpWithinJMFC" tag="span">
                <template v-slot:openHelpIcon>
                    <a :href="'https://www.jemefaiscomprendre.com/' + $t('langApp') + '/doc'"><i class="fas fa-question-circle"></i></a>
                </template>
            </i18n>
        </div>-->
    </div>
</template>

<script>
    import {Router} from "../../js/router";
    import {constants} from "../../js/util/constants";
    import HeaderIcon from '../../vue-components/components/headerIcon.vue'
    import {helpService} from "../../js/service/helpService";
    import {loginService} from "../../js/service/loginService";
    import SubscriptionManager from '../SubscriptionManager.vue';

    export default {
        components: {
            HeaderIcon,
            SubscriptionManager
        },
        props: [],
        data() {
            return {
                loading: false,
                showPopup: false,
                currentPopupIndex: 0,
                popupTotal: 3,
                doNotShowAgain: false
            }
        },
        methods: {
            toMain() {
                Router.toMain();
            },
            toRegister() {
                Router.toRegister();
            },
            toLogin() {
                Router.toLogin();
            },
            useDefaultUser() {
                this.loading = true;
                loginService.registerOffline(constants.LOCAL_NOLOGIN_USERNAME, constants.LOCAL_NOLOGIN_USERNAME).then(() => {
                    Router.toManageGrids();
                });
            },
            openHelp() {
                helpService.openHelp();
            },
            
            // Popup methods
            closePopup() {
                if (this.doNotShowAgain) {
                    localStorage.setItem('neverShowPopup', 'true');
                } else {
                    localStorage.setItem('popupShown', 'true');
                }
                this.showPopup = false;
            },
            closePopupByOutsideClick(event) {
                // Vérifie si l'élément cliqué est bien l'overlay et non un enfant
                if (event.target.classList.contains('popup-overlay')) {
                    this.closePopup();
                }
            },
            nextPopup() {
                if (this.currentPopupIndex < this.popupTotal - 1) {
                    this.currentPopupIndex++;
                }
            },
            prevPopup() {
                if (this.currentPopupIndex > 0) {
                    this.currentPopupIndex--;
                }
            },
            goToPopup(index) {
                this.currentPopupIndex = index;
            },
            handleSubscriptionUpdate() {
                // Rafraîchir la page ou mettre à jour l'état si nécessaire
                this.$forceUpdate();
            }
        },
        mounted() {
            // Vérifie si l'utilisateur a demandé à ne jamais revoir le popup
            const neverShowPopup = localStorage.getItem('neverShowPopup');
            if (neverShowPopup !== 'true') {
                this.$nextTick(() => { // On utilise nextTick pour s'assurer que le DOM est complètement chargé
                    this.showPopup = true;
                });
            }
        }
    }
</script>

<style scoped>
    h2 {
        margin-bottom: 0.5em;
    }
    h3 {
        margin-bottom: 0.5em;
    }
    li {
        margin-bottom: 0;
        list-style-type: none;
        margin-left: 0.5em;
    }
    ul {
        margin-bottom: 0.5em;
    }
    .fa-check {
        color: green;
        margin-right: 1em;
    }
    .fa-info-circle {
        color: #266697;
        margin-right: 0.5em;
    }
    .welcome-p {
        text-align: justify;
        padding: 0 30px 0 15px;
    }
    /* Popup styles */
    .popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .popup-container {
        background: var(--col-bck);
        color: white;;
        border-radius: 8px;
        width: 90%;
        max-width: 980px;
        padding: 20px;
        position: relative;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        max-height: 90vh;
        overflow-y: auto;
    }

    .popup-close {
        position: absolute;
        top: 10px;
        right: 15px;
        font-size: 24px;
        border: none;
        background: var(--col-blue);
        cursor: pointer;
        color: inherit;
        line-height: 1;
    }

    .popup-navigation {
        display: flex;
        align-items: stretch;
        position: relative;
        margin-top: 20px;
    }

    .popup-slides-wrapper {
        flex-grow: 1;
        position: relative;
        overflow-x: hidden;
        overflow-y: auto;
        height: 550px;
    }

    .nav-arrow {
        background: var(--col-blue);
        border: none;
        font-size: 20px;
        cursor: pointer;
        padding: 10px;
        color: inherit;
        z-index: 2;
        align-self: center;
    }

    .nav-arrow:disabled {
        opacity: 0;
        background: transparent;
        color: #ccc;
        cursor: not-allowed;
    }

    .popup-slide {
        text-align: center;
        padding: 0 10px;
        width: 100%;
    }

    .popup-slide img {
        max-width: 100%;
        height: auto;
    }

    .popup-indicators {
        display: flex;
        justify-content: center;
        margin-top: 20px;
    }

    .popup-indicators span {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: white;
        margin: 0 5px;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .popup-indicators span.active {
        background-color: #555;
    }

    .popup-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #eee;
    }

    .do-not-show-again {
        display: flex;
        align-items: center;
        cursor: pointer;
        font-size: 14px;
        color: #666;
    }

    .do-not-show-again input {
        margin-right: 8px;
    }

    .popup-start-button {
        background: var(--col-blue);
        color: white;
        padding: 8px 16px;
        cursor: pointer;
        font-weight: bold;
        transition: opacity 0.3s ease;
    }

    /* Animations */
    .fade-enter-active, .fade-leave-active {
        transition: opacity 0.5s;
    }
    .fade-enter, .fade-leave-to {
        opacity: 0;
    }

    .slide-enter-active, .slide-leave-active {
        transition: all 0.4s ease;
        position: absolute;
        width: 100%;
        top: 0;
        left: 0;
    }
    
    .slide-enter {
        transform: translateX(100%);
        opacity: 0;
    }
    
    .slide-leave-to {
        transform: translateX(-100%);
        opacity: 0;
    }
    cssCopy.video-container {
        position: relative;
        padding-bottom: 56.25%; /* Ratio 16:9 */
        height: 0;
        overflow: hidden;
        max-width: 100%;
        margin: 20px auto;
    }

    .video-container iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }   

    .subscription-section {
        margin-top: 1rem;
        padding: 1rem;
        background-color: #f8f9fa;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .mt-5 {
        margin-top: 3rem;
    }
</style>
