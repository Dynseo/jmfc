<template>
    <div class="overflow-content">
        <header-icon full-header="true"></header-icon>
        <div class="container px-3 px-md-5 ms-0 col-12 col-md-10 col-xl-9 pt-4 pt-lg-5">
            <div class="row">
                <h2 class="alignCenter">{{ $t('help') }}</h2>
                <div>
                    <span>{{ $t('theFollowingRessourcesForHelpOnJMFC') }}</span>:
                </div>
                <ul>
                    <li><a href="https://www.jemefaiscomprendre.com/documentation/" target="_blank"><span>{{ $t('onlineDocumentation') }}</span></a></li>
                    <li><a href="https://www.youtube.com/@JeMeFaisComprendre" target="_blank"><span>{{ $t('tutorialVideosOnYoutube') }}</span></a></li>
                </ul>
            </div>
            <div class="row">
                <h2 class="alignCenter">{{ $t('contactAndFeedback') }}</h2>
                <span>{{ $t('ifYouEncounterAnErrorHaveSuggestions') }}  <a href="mailto:contact@jemefaiscomprendre.com">contact@jemefaiscomprendre.com</a></span> 
            </div>
        </div>
        <div class="bottom-spacer"></div>
    </div>
</template>

<script>
    import HeaderIcon from '../../vue-components/components/headerIcon.vue'
    import {i18nService} from "../../js/service/i18nService.js";

    export default {
        components: {HeaderIcon},
        props: [],
        data() {
            return {
                currentLang: i18nService.getAppLang()
            }
        },
        methods: {
        },
        mounted() {
        }
    }
</script>

<style scoped>
    h2, h1 {
        margin-bottom: 0.5em;
    }
    h3 {
        margin-bottom: 0.5em;
        margin-top: 1.5em;
    }
    li {
        margin-top: 0.5em;
    }
    ul {
        list-style-position: outside;
        padding-left: 2em;
        margin-top: 1em;
    }
</style>