<template>
    <div class="overflow-content">
        <header-icon full-header="true"></header-icon>
        <div class="srow content spaced">
            <h2 class="alignCenter"><span>{{ $t('resetPassword') }}</span></h2>
            <div class="eleven columns offset-by-one">
                <div class="srow" v-if="!tokenProvided">
                    <div class="eleven columns offset-by-four">
                        <div class="alert error" role="alert">
                            <i class="fa fa-exclamation-triangle"></i>
                            <span>{{ $t('resetPasswordInvalidLink') }}</span>
                        </div>
                        <a href="#forgot-password">{{ $t('forgotPassword') }}</a>
                    </div>
                </div>
                <template v-else>
                    <form v-if="showForm" autocomplete="off" @submit.prevent="submit">
                        <div class="srow">
                            <label for="newPassword" class="four columns"><span class="desktop-right">{{ $t('newPassword') }}</span></label>
                            <input
                                ref="passwordInput"
                                type="password"
                                id="newPassword"
                                v-model="password"
                                class="four columns"
                                required
                                autocomplete="new-password"
                            />
                        </div>
                        <div class="srow">
                            <label for="confirmPassword" class="four columns"><span class="desktop-right">{{ $t('confirmNewPassword') }}</span></label>
                            <input
                                type="password"
                                id="confirmPassword"
                                v-model="confirmPassword"
                                class="four columns"
                                required
                                autocomplete="new-password"
                                @input="handleConfirmInput"
                            />
                        </div>
                        <div class="srow" v-if="showMismatchWarning">
                            <div class="eleven columns offset-by-four">
                                <p class="error-hint">{{ $t('resetPasswordMismatch') }}</p>
                            </div>
                        </div>
                        <div class="srow">
                            <div class="eleven columns offset-by-four">
                                <p class="info">{{ $t('resetPasswordInstructions') }}</p>
                            </div>
                        </div>
                        <div class="srow alignCenter">
                            <button type="submit" class="four columns floatNone" :disabled="!canSubmit">
                                <span v-if="!submitting">{{ $t('resetPasswordButton') }}</span>
                                <span v-else>{{ $t('resetPasswordSubmitting') }}</span>
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
                    <div class="srow" v-if="status === 'success'">
                        <div class="eleven columns offset-by-four">
                            <a href="#login">{{ $t('backToLogin') }}</a>
                        </div>
                    </div>
                </template>
            </div>
        </div>
        <div class="bottom-spacer"></div>
    </div>
</template>

<script>
    import HeaderIcon from '../../vue-components/components/headerIcon.vue';
    import { loginService } from './../../js/service/loginService.js';
    import { Router } from './../../js/router.js';

    export default {
        components: { HeaderIcon },
        props: {
            token: {
                type: String,
                default: ''
            }
        },
        data() {
            return {
                password: '',
                confirmPassword: '',
                submitting: false,
                status: null,
                statusMessage: '',
                showForm: true
            };
        },
        computed: {
            tokenProvided() {
                return typeof this.token === 'string' && this.token.length > 0;
            },
            passwordsMatch() {
                if (!this.password || !this.confirmPassword) {
                    return true;
                }
                return this.password === this.confirmPassword;
            },
            showMismatchWarning() {
                return this.confirmPassword.length > 0 && !this.passwordsMatch;
            },
            canSubmit() {
                return (
                    this.tokenProvided &&
                    !!this.password &&
                    !!this.confirmPassword &&
                    this.passwordsMatch &&
                    !this.submitting
                );
            }
        },
        watch: {
            token() {
                this.resetState();
                this.focusPasswordInput();
            }
        },
        mounted() {
            this.focusPasswordInput();
        },
        methods: {
            async submit() {
                if (!this.tokenProvided) {
                    this.status = 'error';
                    this.statusMessage = this.$t('resetPasswordInvalidLink');
                    return;
                }
                if (!this.password || !this.confirmPassword) {
                    this.status = 'error';
                    this.statusMessage = this.$t('resetPasswordPasswordRequired');
                    return;
                }
                if (!this.passwordsMatch) {
                    this.status = 'error';
                    this.statusMessage = this.$t('resetPasswordMismatch');
                    return;
                }
                this.submitting = true;
                this.status = null;
                this.statusMessage = '';
                try {
                    await loginService.resetPassword(this.token, this.password);
                    this.status = 'success';
                    this.statusMessage = this.$t('resetPasswordSuccess');
                    this.showForm = false;
                    this.password = '';
                    this.confirmPassword = '';
                    setTimeout(() => {
                        Router.toLogin();
                    }, 3000);
                } catch (error) {
                    this.status = 'error';
                    this.statusMessage = this.mapErrorToMessage(error);
                } finally {
                    this.submitting = false;
                }
            },
            mapErrorToMessage(error) {
                if (error === loginService.ERROR_CODE_PASSWORD_REQUIRED) {
                    return this.$t('resetPasswordPasswordRequired');
                }
                if (error === loginService.ERROR_CODE_RESET_TOKEN_INVALID) {
                    return this.$t('resetPasswordInvalidLink');
                }
                if (error === loginService.ERROR_CODE_NETWORK_ERROR) {
                    return this.$t('forgotPasswordNetworkError');
                }
                if (error && typeof error === 'object') {
                    if (error.status === 400) {
                        return this.$t('resetPasswordInvalidLink');
                    }
                    if (typeof error.message === 'string' && error.message.toLowerCase().includes('network')) {
                        return this.$t('forgotPasswordNetworkError');
                    }
                    if (typeof error.error === 'string' && error.error.toLowerCase().includes('network')) {
                        return this.$t('forgotPasswordNetworkError');
                    }
                }
                return this.$t('resetPasswordGenericError');
            },
            handleConfirmInput() {
                if (this.status === 'error' && this.passwordsMatch) {
                    this.status = null;
                    this.statusMessage = '';
                }
            },
            resetState() {
                this.password = '';
                this.confirmPassword = '';
                this.submitting = false;
                this.status = null;
                this.statusMessage = '';
                this.showForm = true;
            },
            focusPasswordInput() {
                this.$nextTick(() => {
                    const input = this.$refs.passwordInput;
                    if (input) {
                        input.focus();
                    }
                });
            }
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
    .error-hint {
        margin: 0;
        color: #c0392b;
        font-size: 0.9em;
    }
</style>
