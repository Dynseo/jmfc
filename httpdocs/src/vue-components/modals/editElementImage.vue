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
            setBase64(base64) {
                if (!base64) {
                    return;
                }
                let thiz = this;
                if (base64.length > 50 * 1024) {
                    imageUtil.convertBase64(base64, 2 * thiz.elementW).then(newData => {
                        if (newData.length < base64.length) {
                            log.info(`converted image from ${Math.round(base64.length / 1024)}kB to ${Math.round(newData.length / 1024)}kB`);
                            thiz.gridElement.image.data = newData;
                        } else {
                            log.info(`converting resulted in bigger image (${Math.round(newData.length / 1024)}kB), using old image with ${Math.round(base64.length / 1024)}kB`);
                            thiz.gridElement.image.data = base64;
                        }
                    })
                } else {
                    log.debug(`image size is ${Math.round(base64.length / 1024)}kB`);
                    thiz.gridElement.image.data = base64;
                }
            },
            clearImage() {
                this.gridElement.image = JSON.parse(JSON.stringify(new GridImage()));
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

    @media (max-width: 850px) {
        #inputSearch {
            width: 80%;
        }
    }
</style>