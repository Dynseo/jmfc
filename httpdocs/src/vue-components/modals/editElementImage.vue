<template>
    <div @dragenter="preventDefault" @dragover="preventDefault" @drop="imageDropped">
        <div class="srow">
            <label for="inputImg" class="two columns">{{ $t('image') }}</label>
            <button onclick="document.getElementById('inputImg').click();" class="three columns file-input">
                <input type="file" class="five columns" id="inputImg" @change="changedImg" accept="image/*"/>
                <span><i class="fas fa-file-upload"/> <span>{{ $t('chooseFile') }}</span></span>
            </button>
            <button onclick="document.getElementById('takePhoto').click();" class="three columns file-input">
                <input type="file" class="five columns" id="takePhoto" name="image" @change="usePhoto" accept="image/*" capture="environment">
                <span><i class="fas fa-camera-retro" /> <span>{{ $t('takePhoto') }}</span></span>
            </button>
            <button class="three columns" v-show="hasImage" @click="clearImage"><i class="fas fa-times"/> <span>{{ $t('clearImage') }}</span></button>
        </div>
        <div class="srow" v-if="recentImages.length">
            <label class="two columns">{{ $t('recentImages') }}</label>
            <div class="ten columns recent-images">
                <button
                    v-for="(recent, index) in recentImages"
                    :key="recent.addedAt + '-' + index"
                    type="button"
                    class="recent-image"
                    :title="$t('useRecentImage')"
                    :aria-label="$t('useRecentImage')"
                    @click="useRecentImage(recent)">
                    <img :src="recent.data" :alt="$t('useRecentImage')" />
                </button>
            </div>
        </div>
        <div class="srow" v-if="isLibraryLoading">
            <label class="two columns">{{ $t('imageLibrary') }}</label>
            <div class="ten columns">
                <span>{{ $t('imageLibraryLoading') }}</span>
            </div>
        </div>
        <div class="srow" v-else-if="libraryImages.length">
            <label class="two columns">{{ $t('imageLibrary') }}</label>
            <div class="ten columns recent-images">
                <button
                    v-for="image in libraryImages"
                    :key="image.id"
                    type="button"
                    class="recent-image"
                    :title="image.name || $t('useLibraryImage')"
                    :aria-label="image.name || $t('useLibraryImage')"
                    @click="useLibraryImage(image)"
                >
                    <img :src="image.previewUrl" :alt="image.name || $t('useLibraryImage')" />
                </button>
            </div>
        </div>
        <div class="srow">
            <div class="img-preview offset-by-two four columns">
                <span class="show-mobile" v-show="!hasImage"><i class="fas fa-image"/> <span>{{ $t('noImageChosen') }}</span></span>
                <span class="hide-mobile" v-show="!hasImage"><i class="fas fa-arrow-down"/> <span>{{ $t('dropImageHere') }}</span></span>
                <img v-if="hasImage" id="imgPreview" :src="gridElement.image.data || gridElement.image.url"/>
                <div v-if="gridElement.image.author">
                    {{ $t('by') }} <a :href="gridElement.image.authorURL" target="_blank">{{gridElement.image.author}}</a>
                </div>
            </div>
            <div class="img-preview five columns hide-mobile" v-show="hasImage" style="margin-top: 50px;">
                <span><i class="fas fa-arrow-down"/> <span>{{ $t('dropNewImageHere') }}</span></span>
            </div>
        </div>
    </div>
</template>

<script>
    import {imageUtil} from './../../js/util/imageUtil';
    import './../../css/modal.css';
    import {helpService} from "../../js/service/helpService";
    import {util} from "../../js/util/util";
    import {constants} from "../../js/util/constants.js";
    import Accordion from "../components/accordion.vue";
    import {GridImage} from "../../js/model/GridImage.js";
    import {i18nService} from "../../js/service/i18nService.js";
    import {localStorageService} from "../../js/service/data/localStorageService.js";

    export default {
        props: ['gridElement', 'gridData', 'imageSearch'],
        components: {Accordion},
        computed: {
            hasImage: function () {
                return this.gridElement && this.gridElement.image && (this.gridElement.image.data || this.gridElement.image.url);
            }
        },
        data: function () {
            return {
                constants: constants,
                i18nService: i18nService,
                localStorageService: localStorageService,
                recentImages: [],
                libraryImages: [],
                isLibraryLoading: false
            }
        },
        methods: {
            changedImg() {
                let thiz = this;
                thiz.clearImage();
                imageUtil.getBase64FromInput($('#inputImg')[0]).then(base64 => {
                    thiz.setBase64(base64);
                });
            },
            usePhoto() {
                let thiz = this;
                thiz.clearImage();
                imageUtil.getBase64FromInput($('#takePhoto')[0]).then(base64 => {
                    thiz.setBase64(base64);
                });
            },
            imageDropped(event) {
                let thiz = this;
                event.preventDefault();
                this.clearImage();
                if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                    $('#inputImg')[0].files = event.dataTransfer.files;
                    this.changedImg();
                } else {
                    let url = event.dataTransfer.getData('URL');
                    imageUtil.urlToBase64(url).then(resultBase64 => {
                        thiz.setBase64(resultBase64);
                    });
                }
            },
            loadRecentImages() {
                this.recentImages = localStorageService.getRecentImages();
            },
            async loadLibraryImages() {
                this.isLibraryLoading = true;
                try {
                    const response = await fetch('https://app.jemefaiscomprendre.com/api/image-library.php', {
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok) {
                        const message = payload && payload.message ? payload.message : 'Failed to load library';
                        throw new Error(message);
                    }
                    const items = Array.isArray(payload.images) ? payload.images : [];
                    this.libraryImages = items
                        .map((item) => {
                            const resolvedUrl = this.normaliseLibraryUrl(item.publicUrl || item.url);
                            if (!resolvedUrl) {
                                return null;
                            }
                            return {
                                id: item.id,
                                name: item.name,
                                previewUrl: resolvedUrl,
                                sourceUrl: resolvedUrl
                            };
                        })
                        .filter(Boolean);
                } catch (error) {
                    log.warn('Unable to load shared image library', error);
                    this.libraryImages = [];
                } finally {
                    this.isLibraryLoading = false;
                }
            },
            setImageData(imageData) {
                if (!imageData) {
                    return;
                }
                this.gridElement.image.data = imageData;
                this.gridElement.image.url = null;
                this.gridElement.image.author = null;
                this.gridElement.image.authorURL = null;
                this.gridElement.image.searchProviderName = null;
                this.gridElement.image.searchProviderOptions = [];
                this.recentImages = localStorageService.addRecentImage(imageData);
            },
            async useLibraryImage(image) {
                if (!image || !image.sourceUrl) {
                    return;
                }

                const resolvedUrl = image.sourceUrl;
                const base64 = await this.fetchImageAsBase64(resolvedUrl);

                if (base64) {
                    this.setImageData(base64);
                    return;
                }

                this.gridElement.image = new GridImage({
                    data: null,
                    url: resolvedUrl,
                    author: image.author || null,
                    authorURL: image.authorURL || null,
                    searchProviderName: null,
                    searchProviderOptions: []
                });
                this.$nextTick(() => this.$forceUpdate());
            },
            async fetchImageAsBase64(url) {
                if (!url) {
                    return null;
                }

                try {
                    const response = await fetch(url, {
                        mode: 'cors',
                        credentials: 'include'
                    });

                    if (!response.ok) {
                        return null;
                    }

                    const blob = await response.blob();
                    if (!blob || !blob.type || !blob.type.startsWith('image/')) {
                        return null;
                    }

                    return await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(blob);
                    });
                } catch (error) {
                    log.warn('Unable to convert shared image to base64', error);
                    return null;
                }
            },
            normaliseLibraryUrl(rawUrl) {
                if (!rawUrl || typeof rawUrl !== 'string') {
                    return null;
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
                    if (this.constants.IS_ENVIRONMENT_PROD) {
                        return 'https://app.jemefaiscomprendre.com' + rawUrl;
                    }
                    return 'https://localhost' + rawUrl;
                }

                return rawUrl;
            },
            setBase64(base64) {
                if (!base64) {
                    return;
                }
                if (base64.length > 50 * 1024) {
                    imageUtil.convertBase64(base64, 2 * this.elementW).then(newData => {
                        if (newData && newData.length < base64.length) {
                            log.info(`converted image from ${Math.round(base64.length / 1024)}kB to ${Math.round(newData.length / 1024)}kB`);
                            this.setImageData(newData);
                        } else {
                            let size = newData ? Math.round(newData.length / 1024) : Math.round(base64.length / 1024);
                            log.info(`converting resulted in bigger image (${size}kB), using original image with ${Math.round(base64.length / 1024)}kB`);
                            this.setImageData(base64);
                        }
                    })
                } else {
                    log.debug(`image size is ${Math.round(base64.length / 1024)}kB`);
                    this.setImageData(base64);
                }
            },
            clearImage() {
                this.gridElement.image = JSON.parse(JSON.stringify(new GridImage()));
            },
            useRecentImage(recentImage) {
                if (!recentImage || !recentImage.data) {
                    return;
                }
                this.setImageData(recentImage.data);
            },
            preventDefault(event) {
                event.preventDefault();
            },
            openHelp() {
                helpService.openHelp();
            },
            afterColorChange() {
                this.$forceUpdate();
            }
        },
        mounted() {
            helpService.setHelpLocation('', '#main');
            let maxElementX = Math.max(...this.gridData.gridElements.map(e => e.x + 1));
            this.elementW = Math.round($('#grid-container')[0].getBoundingClientRect().width / maxElementX);
            if (this.imageSearch) {
                this.search(this.imageSearch);
            }
            this.loadRecentImages();
            this.loadLibraryImages();
        },
        beforeDestroy() {
            helpService.revertToLastLocation();
        }
    }
</script>

<style scoped>
    .img-preview > span {
        border: 1px solid lightgray;
        padding: 0.3em;
        width: 150px;
    }

    #imgPreview {
        width: 150px;
    }

    .img-result:hover {
        outline: 2px solid black;
    }

    .srow {
        margin-top: 1em;
    }

    .colorSelector button[aria-selected="true"] {
        outline: 5px dashed darkblue;
    }

    .colorSelector button {
        margin-right: 0.5em;
        padding: 0;
        line-height: 1em;
        height: 1.5em;
        width: 3.5em;
    }

    .recent-images {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5em;
        align-items: center;
    }

    .recent-image {
        border: none;
        background: transparent;
        padding: 0;
        cursor: pointer;
    }

    .recent-image img {
        width: 75px;
        height: 75px;
        object-fit: contain;
        border: 1px solid lightgray;
        border-radius: 4px;
        background: #fff;
        padding: 0.25em;
    }

    .recent-image:focus-visible {
        outline: 3px solid #0078d4;
        border-radius: 6px;
    }

    @media (max-width: 850px) {
        #inputSearch {
            width: 80%;
        }
    }
</style>