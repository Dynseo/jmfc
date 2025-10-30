<template>
    <div class="overflow-content">
        <header-icon full-header="true"></header-icon>
        <div class="srow content spaced">
            <h2 class="alignCenter"><span>{{ $t('forgotPassword') }}</span></h2>
            <div class="eleven columns offset-by-one">
                <form autocomplete="on" @submit.prevent="submit">
                    <div class="srow">
                        <label for="resetEmail" class="four columns"><span class="desktop-right">{{ $t('yourEmail') }}</span></label>
                        <input
                            type="email"
                            id="resetEmail"
                            v-model.trim="email"
                            class="four columns"
                            required
                            autocomplete="email"
                        />
                    </div>
                    <div class="srow">
                        <div class="eleven columns offset-by-four">
                            <p class="info">{{ $t('forgotPasswordInstructions') }}</p>
                        </div>
                    </div>
                    <div class="srow alignCenter">
                        <button type="submit" class="four columns floatNone" :disabled="sending || !email">
                            <span v-if="!sending">{{ $t('sendResetLink') }}</span>
                            <span v-else>{{ $t('sendingResetLink') }}</span>
                        </button>
                    </div>
                </form>
                <div class="srow" v-if="statusMessage">
                    <div class="eleven columns offset-by-four">
                        <div class="alert" :class="status === 'success' ? 'success' : 'error'" role="alert">
                            <i class="fa" :class="status === 'success' ? 'fa-check' : 'fa-exclamation-triangle'"></i>
                            <span>{{ statusMessage }}</span>
                        </div>
                    </div>
                </div>
                <div class="srow">
                    <div class="eleven columns offset-by-four">
                        <a href="#login">{{ $t('backToLogin') }}</a>
                    </div>
                </div>
            </div>
        </div>
        <div class="bottom-spacer"></div>
    </div>
</template>

<script>
    import HeaderIcon from '../../vue-components/components/headerIcon.vue';
    import { loginService } from './../../js/service/loginService.js';

    export default {
        components: { HeaderIcon },
        data() {
            return {
                email: '',
                sending: false,
                status: null,
                statusMessage: ''
            };
        },
        methods: {
            async submit() {
                if (this.sending || !this.email) {
                    return;
                }
                this.sending = true;
                this.status = null;
                this.statusMessage = '';
                try {
                    await loginService.requestPasswordReset(this.email);
                    this.status = 'success';
                    this.statusMessage = this.$t('forgotPasswordSuccess');
                    this.email = '';
                } catch (error) {
                    console.warn('Password reset request failed', error);
                    this.status = 'error';
                    this.statusMessage = this.mapErrorToMessage(error);
                } finally {
                    this.sending = false;
                }
            },
            mapErrorToMessage(error) {
                if (error === loginService.ERROR_CODE_EMAIL_REQUIRED) {
                    return this.$t('forgotPasswordEmailRequired');
                }
                if (error === loginService.ERROR_CODE_NETWORK_ERROR) {
                    return this.$t('forgotPasswordNetworkError');
                }
                if (error && typeof error === 'object') {
                    if (error.status === 0) {
                        return this.$t('forgotPasswordNetworkError');
                    }
                    if (typeof error.message === 'string' && error.message.toLowerCase().includes('network')) {
                        return this.$t('forgotPasswordNetworkError');
                    }
                    if (typeof error.error === 'string' && error.error.toLowerCase().includes('network')) {
                        return this.$t('forgotPasswordNetworkError');
                    }
                }
                return this.$t('forgotPasswordGenericError');
            }
        },
        mounted() {
            this.$nextTick(() => {
                const input = document.getElementById('resetEmail');
                if (input) {
                    input.focus();
                }
            });
        }
    };
</script>

<style scoped>
    .content {
        display: flex;
        flex-direction: column;
        flex: 1 0 auto;
    }
    .info {
        margin: 0;
        color: #444;
    }
    .alert {
        display: flex;
        align-items: center;
        padding: 0.75em 1em;
        border-radius: 4px;
        line-height: 1.4;
    }
    .alert.success {
        background: #e6f6ec;
        color: #1f7a36;
    }
    .alert.error {
        background: #fdecea;
        color: #c0392b;
    }
    .alert i {
        margin-right: 0.75em;
    }
</style>
