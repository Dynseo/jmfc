<template>
    <div v-if="gridElement">
        <div class="srow">
            <label class="three columns">{{ $t('newAction') }}</label>
            <select id="selectActionType" v-focus="" class="four columns" v-model="selectedNewAction" style="margin-bottom: 0.5em">
                <option v-for="type in actionTypes" :value="type.getModelName()">{{type.getModelName() | translate}}</option>
            </select>
            <button class="four columns" @click="addAction()"><i class="fas fa-plus"/> <span>{{ $t('addAction') }}</span></button>
        </div>
        <div class="srow">
            <h2 for="actionList" class="twelve columns" style="margin-top: 1em; font-size: 1.2em">{{ $t('currentActions') }}</h2>
        </div>
        <ul id="actionList">
                            <span v-show="gridElement.actions.length == 0" class="srow">
                                <i18n path="noActionsDefinedClickOnAdd" tag="span">
                                    <template v-slot:addAction>
                                        <i class="fas fa-plus"/> <span class="hide-mobile">{{ $t('addAction') }}</span>
                                    </template>
                                </i18n>
                            </span>
            <li v-for="action in gridElement.actions" class="srow">
                <div class="row mt-0">
                    <div class="col-12 col-md-4 mb-3">
                        <span v-show="editActionId !== action.id">{{action.modelName | translate}}</span>
                        <span v-show="editActionId === action.id">
                            <b>{{action.modelName | translate}}</b>
                        </span>
                    </div>
                    <div class="col-12 col-md-8 actionbtns">
                        <button @click="editAction(action)"><i class="far fa-edit"/>
                            <span class="hide-mobile" v-show="editActionId !== action.id">{{ $t('edit') }}</span>
                            <span class="hide-mobile" v-show="editActionId === action.id">{{ $t('endEdit') }}</span>
                        </button>
                        <button @click="deleteAction(action)"><i class="far fa-trash-alt"/> <span class="hide-mobile">{{ $t('delete') }}</span></button>
                        <button v-if="GridElementClass.canActionClassBeTested(action.modelName)" @click="testAction(action)"><i class="fas fa-bolt"/> <span class="hide-mobile">{{ $t('test') }}</span></button>
                    </div>
                </div>
                <div v-if="editActionId === action.id" style="margin-top: 1.5em; margin-bottom: 1em">
                    <div v-if="action.modelName == 'GridActionSpeak'">
                        <div class="srow">
                            <div class="four columns">
                                <label for="selectLang" class="normal-text">{{ $t('language') }}</label>
                            </div>
                            <select class="eight columns" id="selectLang" v-model="action.speakLanguage">
                                <option :value="undefined">{{ $t('automaticCurrentLanguage') }}</option>
                                <option v-for="lang in voiceLangs.filter(e => Object.keys(gridElement.label).includes(e.code))" :value="lang.code">
                                    {{lang | extractTranslation}}
                                </option>
                            </select>
                        </div>
                        <div class="srow" v-if="action.speakLanguage">
                            <div class="eight columns offset-by-four">
                                <span>{{ $t('label') }}</span><span> ({{ $t('lang.' + action.speakLanguage) }})</span>: {{gridElement.label[action.speakLanguage]}}
                            </div>
                        </div>
                    </div>
                    <div v-if="action.modelName == 'GridActionSpeakCustom'">
                        <div class="srow">
                            <div class="four columns">
                                <label for="selectLang2" class="normal-text">{{ $t('language') }}</label>
                            </div>
                            <select class="eight columns" id="selectLang2" v-model="action.speakLanguage">
                                <option :value="undefined">{{ $t('automaticCurrentLanguage') }}</option>
                                <option v-for="lang in voiceLangs" :value="lang.code">
                                    {{lang | extractTranslation}}
                                </option>
                            </select>
                        </div>
                        <div class="srow">
                            <div class="four columns">
                                <label for="inCustomText" class="normal-text">{{ $t('textToSpeak') }}</label>
                            </div>
                            <input class="eight columns" id="inCustomText" type="text" v-model="action.speakText[getCurrentSpeakLang(action)]"/>
                        </div>
                    </div>
                    <div v-if="action.modelName == 'GridActionAudio'">
                        <edit-audio-action :action="action" :grid-data="gridData"></edit-audio-action>
                    </div>
                    <div v-if="action.modelName == 'GridActionNavigate'">
                        <div class="srow">
                            <label for="selectNavType" class="four columns normal-text">{{ $t('navigationType') }}</label>
                            <select class="eight columns" id="selectNavType" v-model="action.navType">
                                <option v-for="type in Object.values(GridActionNavigate.NAV_TYPES)" :value="type">{{ type | translate }}</option>
                            </select>
                        </div>
                        <div class="srow" v-if="action.navType === GridActionNavigate.NAV_TYPES.TO_GRID">
                            <div class="four columns">
                                <label for="selectGrid" class="normal-text">{{ $t('navigateToGrid') }}</label>
                            </div>
                            <select class="eight columns" id="selectGrid" v-model="action.toGridId">
                                <option v-for="grid in grids" :value="grid.id">
                                    {{grid.label | extractTranslation}}
                                </option>
                            </select>
                        </div>
                    </div>
                    <div v-if="action.modelName == 'GridActionCollectElement'">
                        <div class="srow">
                            <div class="twelve columns">
                                <label for="selectCollectElmAction" class="four columns normal-text">{{ $t('performActionOnCollectElement') }}</label>
                                <select id="selectCollectElmAction" class="eight columns" v-model="action.action">
                                    <option v-for="elmAction in collectActions" :value="elmAction">
                                        {{elmAction | translate}}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div v-if="action.modelName === GridActionSystem.getModelName()">
                        <div class="srow">
                            <div class="twelve columns">
                                <label for="systemActionType" class="four columns normal-text">{{ $t('actionType') }}</label>
                                <select id="systemActionType" class="eight columns" v-model="action.action">
                                    <option v-for="action in GridActionSystem.actions" :value="action">{{ action | translate}}</option>
                                </select>
                            </div>
                        </div>
                        <div class="srow" v-if="[GridActionSystem.actions.SYS_VOLUME_UP, GridActionSystem.actions.SYS_VOLUME_DOWN].includes(action.action)">
                            <div class="twelve columns">
                                <label for="systemActionValue" class="four columns normal-text">{{ $t(action.action) }} {{ $t('percentBracket') }}</label>
                                <input type="number" class="eight columns" min="0" max="100" v-model.number="action.actionValue">
                            </div>
                        </div>
                    </div>
                </div>
            </li>
        </ul>
    </div>
</template>

<script>
    import {dataService} from '../../js/service/data/dataService'
    import {actionService} from './../../js/service/actionService'
    import {speechService} from './../../js/service/speechService'
    import {i18nService} from "../../js/service/i18nService";
    import {GridActionNavigate} from "../../js/model/GridActionNavigate";
    import './../../css/modal.css';
    import {GridElement} from "../../js/model/GridElement";
    import {GridData} from "../../js/model/GridData";
    import {GridActionCollectElement} from "../../js/model/GridActionCollectElement";
    import {helpService} from "../../js/service/helpService";
    import Accordion from "../components/accordion.vue";
    import {imageUtil} from "../../js/util/imageUtil";
    import {GridImage} from "../../js/model/GridImage";
    import EditAudioAction from "./editActionsSub/editAudioAction.vue";
    import { gridUtil } from '../../js/util/gridUtil';
    import { GridActionSystem } from '../../js/model/GridActionSystem';

    export default {
        props: ['gridElement', 'gridData'],
        data: function () {
            return {
                grids: null,
                GridElementClass: GridElement,
                editActionId: null,
                selectedNewAction: GridElement.getActionTypes()[0].getModelName(),
                actionTypes: GridElement.getActionTypes(),
                allVoices: speechService.getVoices(),
                voiceLangs: speechService.getVoicesLangs(),
                collectActions: GridActionCollectElement.getActions(),
                allLanguages: i18nService.getAllLanguages(),
                gridLanguageCodes: [],
                selectFromAllLanguages: false,
                selectFromAllVoices: false,
                GridActionNavigate: GridActionNavigate,
                GridActionSystem: GridActionSystem,
                GridElement: GridElement,
                speechService: speechService,
                i18nService: i18nService
            }
        },
        components: {
            EditAudioAction,
            Accordion,
        },
        methods: {
            getCurrentSpeakLang(action) {
                let prefVoiceLang = speechService.getPreferredVoiceLang() || i18nService.getContentLang();
                let currentVoiceLang = speechService.isVoiceLangLinkedToTextLang()  ? prefVoiceLang : i18nService.getContentLang();
                return action && action.speakLanguage ? action.speakLanguage : currentVoiceLang;
            },
            deleteAction (action) {
                this.gridElement.actions = this.gridElement.actions.filter(a => a.id != action.id);
            },
            editAction (action) {
                if (this.editActionId !== action.id) {
                    this.editActionId = action.id;
                } else {
                    this.editActionId = null;
                }
            },
            endEditAction () {
                this.editActionId = null;
            },
            testAction (action) {
                actionService.testAction(this.gridElement, action, new GridData(this.gridData));
            },
            addAction () {
                let thiz = this;
                let newAction = JSON.parse(JSON.stringify(GridElement.getActionInstance(this.selectedNewAction)));
                if (newAction.modelName === GridActionNavigate.getModelName()) {
                    newAction.toGridId = this.grids[0].id;
                }
                thiz.gridElement.actions.push(newAction);
                thiz.editActionId = newAction.id;
            },
            openHelp() {
                helpService.openHelp();
            }
        },
        mounted () {
            let thiz = this;
            thiz.gridLanguageCodes = gridUtil.getGridLangs(thiz.gridData);
            dataService.getGrids(false, true).then(grids => {
                thiz.grids = grids;
                thiz.grids = thiz.grids.sort((a, b) => i18nService.getTranslation(a.label).localeCompare(i18nService.getTranslation(b.label)));
            });
            helpService.setHelpLocation('05_actions', '#edit-actions-modal');
        },
        beforeDestroy() {
            helpService.setHelpLocation('02_navigation', '#edit-view');
        }
    }
</script>

<style scoped>
    .srow {
        margin-top: 1em;
    }

    ul li {
        list-style: none;
        outline: 1px solid lightgray;
        padding: 0.5em;
    }

    [v-cloak] {
        display: none !important;
    }

    .normal-text {
        font-weight: normal;
    }

    .actionbtns button {
        width: 32%;
        padding: 0;
    }
</style>