<template>
    <div class="overflow-content box">
        <header class="srow header" role="toolbar">
            <div class="btn-group left">
                <a href="#settings" :aria-label="$t('settings')">
                    <button tabindex="-1">
                        <i class="fas fa-2x fa-cog"></i>
                        <span class="hide-mobile">&nbsp;&nbsp;{{ $t('settings') }}</span>
                    </button>
                </a>
                <button tabindex="-1" class="spaced small" @click="refresh" :disabled="isLoading || isSaving">
                    <i class="fas fa-sync-alt"></i>
                    <span class="hide-mobile">&nbsp;&nbsp;{{ $t('imageLibraryRefresh') }}</span>
                </button>
            </div>
            <button @click="startCreate" :disabled="isSaving">{{ $t('imageLibraryAdd') }}</button>
        </header>

        <div class="srow content spaced">
            <h2>{{ $t('imageLibrary') }}</h2>
            <p>{{ $t('imageLibraryIntro') }}</p>
            <div class="srow">
                <label class="three columns">{{ $t('imageLibraryWebLinkLabel') || 'Web' }}</label>
                <a href="https://jmfc.dynseo.com" target="_blank" rel="noopener" style="word-break:break-all;">
                    {{ $t('imageLibraryOpenWeb') || 'Télécharger depuis le web' }}
                </a>
                <div class="eight columns file-column" style="display:flex;align-items:center;gap:0.5rem;">
                    <input id="webLinkInput" type="text" readonly value="https://jmfc.dynseo.com" style="flex:1;padding:0.35em;border-radius:4px;border:1px solid rgba(0,0,0,0.1);" />
                    <button
                        type="button"
                        class="spaced small"
                        onclick="(function() { 
                            const url='https://jmfc.dynseo.com'; 
                            if(navigator.clipboard && navigator.clipboard.writeText){ 
                                navigator.clipboard.writeText(url).then(function(){ 
                                    alert('Lien copié'); }, function(){ fallbackCopy(); 
                                }); 
                            } else { 
                                fallbackCopy(); 
                            } function fallbackCopy(){ 
                                const inp=document.getElementById('webLinkInput'); 
                                if(!inp) { 
                                    alert('Impossible de copier'); return; 
                                } 
                                inp.select(); 
                                try{ document.execCommand('copy'); 
                                alert('Lien copié'); 
                            }catch(e){ 
                                alert('Impossible de copier'); 
                            } 
                        }
                    })()">{{ $t('copyLink') || 'Copier le lien' }}</button>
                </div>
            </div>

            <div v-if="statusMessage" :class="['status', statusType]">
                {{ statusMessage }}
            </div>
            <div v-if="error" class="status error">
                {{ error }}
            </div>

            <div v-if="isLoading" class="status info">
                {{ $t('imageLibraryLoading') }}
            </div>

            <template v-else>
                <form v-if="showForm" class="library-form" @submit.prevent="submitForm">
                    <h3>{{ form.id ? $t('imageLibraryFormTitleEdit') : $t('imageLibraryFormTitleCreate') }}</h3>
                    <div class="srow">
                        <label class="three columns" for="imageName">{{ $t('imageLibraryName') }}</label>
                        <input
                            id="imageName"
                            class="eight columns"
                            type="text"
                            v-model.trim="form.name"
                            :disabled="isSaving"
                            required
                        />
                    </div>
                    <div class="srow">
                        <label class="three columns" for="imageDescription">{{ $t('imageLibraryDescriptionLabel') }}</label>
                        <textarea
                            id="imageDescription"
                            class="eight columns"
                            rows="3"
                            v-model.trim="form.description"
                            :disabled="isSaving"
                        ></textarea>
                    </div>
                    <div class="srow">
                        <label class="three columns" for="imageTags">{{ $t('imageLibraryTags') }}</label>
                        <input
                            id="imageTags"
                            class="eight columns"
                            type="text"
                            v-model="form.tagsText"
                            :disabled="isSaving"
                        />
                    </div>
                    <div class="srow">
                        <label class="three columns" for="imageFile">{{ $t('imageLibraryImageFile') }}</label>
                        <div class="file-column eight columns">
                            <input
                                id="imageFile"
                                ref="fileInput"
                                type="file"
                                accept="image/*"
                                @change="handleFileChange"
                                :disabled="isSaving"
                            />
                            <small>{{ $t('imageLibraryUploadHint') }}</small>
                            <button
                                v-if="form.imageData"
                                type="button"
                                class="clear-file"
                                @click="clearSelectedFile"
                                :disabled="isSaving"
                            >{{ $t('clear') }}</button>
                        </div>
                    </div>
                    <div class="srow" v-if="previewUrl">
                        <label class="three columns">{{ $t('imageLibraryPreview') }}</label>
                        <div class="eight columns">
                            <img :src="previewUrl" :alt="form.name" class="preview-image" />
                        </div>
                    </div>
                    <div class="srow">
                        <div class="button-row">
                            <button type="submit" :disabled="isSaving">{{ $t('save') }}</button>
                            <button type="button" class="spaced" @click="cancelForm" :disabled="isSaving">{{ $t('cancel') }}</button>
                        </div>
                    </div>
                </form>

                <div class="table-scroll" v-else>
                    <div v-if="images.length === 0" class="status info">
                        {{ $t('imageLibraryNoImages') }}
                    </div>
                    <table v-else class="library-table">
                        <thead>
                            <tr>
                                <th>{{ $t('imageLibraryPreview') }}</th>
                                <th>{{ $t('imageLibraryName') }}</th>
                                <th>{{ $t('imageLibraryDescriptionLabel') }}</th>
                                <th>{{ $t('imageLibraryTags') }}</th>
                                <th>{{ $t('imageLibraryCreatedAt') }}</th>
                                <th>{{ $t('imageLibraryUpdatedAt') }}</th>
                                <th>{{ $t('actions') }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="image in images" :key="image.id">
                                <td class="preview-cell">
                                    <img v-if="image.url" :src="image.url" :alt="image.name" class="preview-thumb" />
                                </td>
                                <td>{{ image.name }}</td>
                                <td>{{ image.description }}</td>
                                <td>{{ formatTags(image.tags) }}</td>
                                <td>{{ formatDate(image.createdAt) }}</td>
                                <td>{{ formatDate(image.updatedAt) }}</td>
                                <td class="actions-cell">
                                    <button type="button" class="small" @click="startEdit(image)" :disabled="isSaving">{{ $t('edit') }}</button>
                                    <button type="button" class="small danger" @click="deleteImage(image)" :disabled="isSaving">{{ $t('delete') }}</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </template>
        </div>
        <div class="bottom-spacer"></div>
    </div>
</template>

<script>
    import { loginService } from '../../js/service/loginService.js';

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const API_ENDPOINT = 'https://jmfc.dynseo.com/api/image-library.php';

    export default {
        data() {
            return {
                images: [],
                isLoading: false,
                isSaving: false,
                error: null,
                statusMessage: '',
                statusType: 'info',
                showForm: false,
                form: {
                    id: null,
                    name: '',
                    description: '',
                    tagsText: '',
                    imageData: null,
                    previewUrl: ''
                }
            };
        },
        computed: {
            previewUrl() {
                if (this.form.imageData) {
                    return this.form.imageData;
                }
                return this.form.previewUrl || '';
            }
        },
        methods: {
            async refresh() {
                await this.loadImages();
            },
            async loadImages() {
                this.isLoading = true;
                this.error = null;
                try {
                    const response = await fetch(API_ENDPOINT, {
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                    const body = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        const message = body && body.message ? body.message : this.$t('imageLibraryLoadError');
                        throw new Error(message);
                    }
                    const items = Array.isArray(body.images) ? body.images : [];
                    this.images = items.map((item) => this.prepareImageEntry(item));
                } catch (err) {
                    this.error = err && err.message ? err.message : this.$t('imageLibraryLoadError');
                } finally {
                    this.isLoading = false;
                }
            },
            startCreate() {
                this.resetForm();
                this.showForm = true;
            },
            startEdit(image) {
                this.resetForm();
                this.form.id = image.id;
                this.form.name = image.name || '';
                this.form.description = image.description || '';
                this.form.tagsText = this.formatTags(image.tags);
                this.form.previewUrl = image.url || '';
                this.showForm = true;
            },
            cancelForm() {
                this.resetForm();
                this.showForm = false;
            },
            resetForm() {
                this.form = {
                    id: null,
                    name: '',
                    description: '',
                    tagsText: '',
                    imageData: null,
                    previewUrl: ''
                };
                if (this.$refs.fileInput) {
                    this.$refs.fileInput.value = '';
                }
                this.statusMessage = '';
            },
            parseTags() {
                if (!this.form.tagsText) {
                    return [];
                }
                return this.form.tagsText
                    .split(/[,;]/)
                    .map((tag) => tag.trim())
                    .filter((tag, index, arr) => tag && arr.indexOf(tag) === index);
            },
            async submitForm() {
                if (!this.validateForm()) {
                    return;
                }
                const token = loginService.getAuthToken();
                if (!token) {
                    this.showError(this.$t('imageLibraryMissingToken'));
                    return;
                }
                const payload = {
                    id: this.form.id,
                    name: this.form.name.trim(),
                    description: this.form.description.trim(),
                    tags: this.parseTags()
                };
                if (!this.form.id && !this.form.imageData) {
                    this.showError(this.$t('imageLibraryValidationImage'));
                    return;
                }
                if (this.form.imageData) {
                    payload.imageData = this.form.imageData;
                }
                const method = this.form.id ? 'PUT' : 'POST';
                this.isSaving = true;
                try {
                    const response = await fetch(API_ENDPOINT, {
                        method,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });
                    const body = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        const message = body && body.message ? body.message : this.$t('imageLibrarySaveError');
                        throw new Error(message);
                    }
                    this.showSuccess(this.$t('imageLibrarySaveSuccess'));
                    this.showForm = false;
                    await this.loadImages();
                } catch (err) {
                    this.showError(err && err.message ? err.message : this.$t('imageLibrarySaveError'));
                } finally {
                    this.isSaving = false;
                }
            },
            validateForm() {
                if (!this.form.name || !this.form.name.trim()) {
                    this.showError(this.$t('imageLibraryValidationName'));
                    return false;
                }
                return true;
            },
            async deleteImage(image) {
                if (!image || !image.id) {
                    return;
                }
                const token = loginService.getAuthToken();
                if (!token) {
                    this.showError(this.$t('imageLibraryMissingToken'));
                    return;
                }
                const label = image.name || image.id;
                const confirmed = window.confirm(this.$t('imageLibraryConfirmDelete', [label]));
                if (!confirmed) {
                    return;
                }
                this.isSaving = true;
                try {
                    const response = await fetch(`${API_ENDPOINT}?id=${encodeURIComponent(image.id)}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/json'
                        }
                    });
                    const body = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        const message = body && body.message ? body.message : this.$t('imageLibraryDeleteError');
                        throw new Error(message);
                    }
                    this.showSuccess(this.$t('imageLibraryDeleteSuccess'));
                    await this.loadImages();
                } catch (err) {
                    this.showError(err && err.message ? err.message : this.$t('imageLibraryDeleteError'));
                } finally {
                    this.isSaving = false;
                }
            },
            handleFileChange(event) {
                const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
                if (!file) {
                    return;
                }
                if (!file.type || !file.type.startsWith('image/')) {
                    this.showError(this.$t('imageLibraryInvalidImage'));
                    this.clearSelectedFile();
                    return;
                }
                if (file.size > MAX_FILE_SIZE) {
                    this.showError(this.$t('imageLibraryFileTooLarge'));
                    this.clearSelectedFile();
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                    this.form.imageData = reader.result;
                };
                reader.onerror = () => {
                    this.showError(this.$t('imageLibraryInvalidImage'));
                    this.clearSelectedFile();
                };
                reader.readAsDataURL(file);
            },
            clearSelectedFile() {
                this.form.imageData = null;
                if (!this.form.id) {
                    this.form.previewUrl = '';
                }
                if (this.$refs.fileInput) {
                    this.$refs.fileInput.value = '';
                }
            },
            showSuccess(message) {
                this.statusType = 'success';
                this.statusMessage = message;
            },
            showError(message) {
                this.statusType = 'error';
                this.statusMessage = message;
            },
            prepareImageEntry(image) {
                if (!image || typeof image !== 'object') {
                    return {};
                }
                const resolvedUrl = this.normaliseImageUrl(image.publicUrl || image.url);
                return {
                    ...image,
                    url: resolvedUrl,
                    publicUrl: resolvedUrl
                };
            },
            normaliseImageUrl(rawUrl) {
                if (!rawUrl || typeof rawUrl !== 'string') {
                    return '';
                }
                if (/^https?:\/\//i.test(rawUrl)) {
                    return rawUrl;
                }
                if (rawUrl.startsWith('//')) {
                    const protocol = window.location.protocol && window.location.protocol.startsWith('http')
                        ? window.location.protocol
                        : 'https:';
                    return protocol + rawUrl;
                }
                if (rawUrl.startsWith('/')) {
                    if (window.location.origin && window.location.origin.startsWith('http')) {
                        return window.location.origin + rawUrl;
                    }
                    return 'https://jmfc.dynseo.com' + rawUrl;
                }
                return rawUrl;
            },
            formatDate(value) {
                if (!value) {
                    return '';
                }
                const date = new Date(value);
                if (!Number.isFinite(date.getTime())) {
                    return value;
                }
                return date.toLocaleString();
            },
            formatTags(tags) {
                if (!Array.isArray(tags)) {
                    return '';
                }
                return tags.join(', ');
            }
        },
        async mounted() {
            // Autorise la rotation sur cette page
            if (window.cordova && window.cordova.plugins && window.cordova.plugins.screenorientation) {
                window.cordova.plugins.screenorientation.unlock();
            }
            await this.loadImages();
        }
    };
</script>

<style scoped>
    .content {
        display: flex;
        flex-direction: column;
        flex: 1 0 auto;
    }
    .status {
        margin-bottom: 1em;
        padding: 0.75em 1em;
        border-radius: 8px;
    }
    .status.info {
        background: var(--col-grey-light);
        color: var(--col-text);
    }
    .status.success {
        background: rgba(76, 175, 80, 0.15);
        color: #2e7d32;
    }
    .status.error {
        background: rgba(244, 67, 54, 0.15);
        color: #c62828;
    }
    .table-scroll {
        width: 100%;
        overflow-x: auto;
        max-width: 100vw;
    }
    .library-table {
        width: 100%;
        min-width: 800px;
        border-collapse: collapse;
    }
    .library-table th,
    .library-table td {
        padding: 0.6em;
        text-align: left;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        vertical-align: middle;
    }
    .library-table tbody tr:nth-child(odd) {
        background-color: rgba(0, 0, 0, 0.02);
    }
    .preview-thumb {
        width: 64px;
        height: 64px;
        object-fit: cover;
        border-radius: 8px;
    }
    .preview-image {
        max-width: 240px;
        max-height: 240px;
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.1);
    }
    .preview-cell {
        width: 90px;
    }
    .actions-cell button {
        margin-right: 0.5em;
    }
    .actions-cell .danger {
        background: #c62828;
        border-color: #c62828;
        color: #fff;
    }
    .button-row {
        display: flex;
        gap: 1em;
    }
    .clear-file {
        margin-top: 0.5em;
    }
    .library-form textarea {
        resize: vertical;
    }
</style>
