<template>
    <div class="overflow-content">
        <header-icon full-header="true"></header-icon>
        <div class="srow content spaced" style="max-width: 900px">
            <h2 class="twelve columns">{{ $t('aboutJMFC') }}</h2>
            <div>
                <div class="srow">
                    <h3 class="mt-2">{{ $t('generalInformation') }}</h3>
                </div>
                <div class="srow">
                    <h3>{{ $t('termsOfServiceAndPrivacyPolicy') }}</h3>
                    <div>
                        <i18n path="privacyPolicyInfo" tag="span">
                            <template v-slot:privacyPolicy>
                                <a href="app/privacy_en.html?back=about">{{ $t('privacyPolicy') }}</a>
                            </template>
                            <template v-slot:privacyPolicyDe>
                                <a href="app/privacy_fr.html?back=about">{{ $t('privacyPolicy') }}</a>
                            </template>
                        </i18n>
                    </div>
                </div>
            </div>
        </div>
        <div class="bottom-spacer"></div>
    </div>
</template>

<script>
    import {Router} from "../../js/router";
    import HeaderIcon from '../../vue-components/components/headerIcon.vue'

    export default {
        components: { HeaderIcon},
        props: [],
        data() {
            return {
            }
        },
        methods: {
            toMain() {
                Router.toMain();
            },
            toRegister() {
                Router.toRegister();
            }
        },
        mounted() {
        }
    }
</script>

<style scoped>
    .content {
        display: flex;
        flex-direction: column;
        flex: 1 0 auto;
    }

    h2 {
        margin-bottom: 0.5em;
    }
    h3 {
        margin-bottom: 0.5em;
        margin-top: 1.5em;
    }
    .srow {
        margin-bottom: 1.5em;
    }
</style>