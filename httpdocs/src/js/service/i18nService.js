import $ from '../externals/jquery.js';
import VueI18n from 'vue-i18n';
import { localStorageService } from './data/localStorageService.js';
import { constants } from '../util/constants';

let i18nService = {};

let vueI18n = null;
let loadedLanguages = [];
let fallbackLang = 'fr';
let currentContentLang = null;
let currentAppLang = localStorageService.getAppSettings().appLang;

let appLanguages = [
    'fr',
    'en',
    'de',
    'it',
    'es'
];
//all languages in german and english + ISO-639-1 code, extracted from https://de.wikipedia.org/wiki/Liste_der_ISO-639-1-Codes, sorted by german translation
// let allLangCodes = ["aa","ab","ae","af","ak","am","an","ar","ar-ae","ar-bh","ar-dz","ar-eg","ar-iq","ar-jo","ar-kw","ar-lb","ar-ly","ar-ma","ar-om","ar-qa","ar-sa","ar-sy","ar-tn","ar-ye","as","av","ay","az","ba","be","bg","bh","bi","bm","bn","bo","br","bs","ca","ce","ch","co","cr","cs","cu","cv","cy","da","de","de-at","de-ch","de-ch-loc","de-li","de-lu","dv","dz","ee","el","en","en-au","en-bz","en-ca","en-gb","en-ie","en-in","en-jm","en-nz","en-tt","en-us","en-za","eo","es","es-ar","es-bo","es-cl","es-co","es-cr","es-do","es-ec","es-gt","es-hn","es-mx","es-ni","es-pa","es-pe","es-pr","es-py","es-sv","es-uy","es-ve","et","eu","fa","ff","fi","fj","fo","fr","fr-be","fr-ca","fr-ch","fr-lu","fy","ga","gd","gl","gn","gu","gv","ha","he","hi","ho","hr","ht","hu","hy","hz","ia","id","ie","ig","ii","ik","io","is","it","it-ch","iu","ja","ji","jv","ka","kg","ki","kj","kk","kl","km","kn","ko","kr","ks","ku","kv","kw","ky","la","lb","lg","li","ln","lo","lt","lu","lv","mg","mh","mi","mk","ml","mn","mr","ms","mt","my","na","nb","nd","ne","ng","nl","nl-be","nn","no","nr","nv","ny","oc","oj","om","or","os","pa","pi","pl","ps","pt","pt-br","qu","rm","rn","ro","ro-md","ru","ru-md","rw","sa","sb","sc","sd","se","sg","si","sk","sl","sm","sn","so","sq","sr","ss","st","su","sv","sv-fi","sw","ta","te","tg","th","ti","tk","tl","tn","to","tr","ts","tt","tw","ty","ug","uk","ur","uz","val","ve","vi","vo","wa","wo","xh","yi","yo","za","zh","zh-cn","zh-hk","zh-sg","zh-tw","zu"];
let allLangCodes = {
    'aa': { fr: 'Afar', en: 'Afar', de: 'Afar', it: 'Afar', es: 'Afar', code: 'aa' },
    'ab': { fr: 'Abkhaze', en: 'Abkhazian', de: 'Abchasisch', it: 'Abcaso', es: 'Abjasio', code: 'ab' },
    'ae': { fr: 'Avestique', en: 'Avestan', de: 'Avestisch', it: 'Avestico', es: 'Avéstico', code: 'ae' },
    'af': { fr: 'Afrikaans', en: 'Afrikaans', de: 'Afrikaans', it: 'Afrikaans', es: 'Afrikáans', code: 'af' },
    'ak': { fr: 'Akan', en: 'Akan', de: 'Akan', it: 'Akan', es: 'Akan', code: 'ak' },
    'am': { fr: 'Amharique', en: 'Amharic', de: 'Amharisch', it: 'Amarico', es: 'Amárico', code: 'am' },
    'an': { fr: 'Aragonais', en: 'Aragonese', de: 'Aragonesisch', it: 'Aragonese', es: 'Aragonés', code: 'an' },
    'ar': { fr: 'Arabe', en: 'Arabic', de: 'Arabisch', it: 'Arabo', es: 'Árabe', code: 'ar' },
    'as': { fr: 'Assamais', en: 'Assamese', de: 'Assamesisch', it: 'Assamese', es: 'Asamés', code: 'as' },
    'av': { fr: 'Avar', en: 'Avaric', de: 'Awarisch', it: 'Avaro', es: 'Avar', code: 'av' },
    'ay': { fr: 'Aymara', en: 'Aymara', de: 'Aymara', it: 'Aymara', es: 'Aimara', code: 'ay' },
    'az': { fr: 'Azéri', en: 'Azerbaijani', de: 'Aserbaidschanisch', it: 'Azero', es: 'Azerí', code: 'az' },
    'ba': { fr: 'Bachkir', en: 'Bashkir', de: 'Baschkirisch', it: 'Baschiro', es: 'Bashkir', code: 'ba' },
    'be': { fr: 'Biélorusse', en: 'Belarusian', de: 'Weißrussisch', it: 'Bielorusso', es: 'Bielorruso', code: 'be' },
    'bg': { fr: 'Bulgare', en: 'Bulgarian', de: 'Bulgarisch', it: 'Bulgaro', es: 'Búlgaro', code: 'bg' },
    'bh': { fr: 'Bihari', en: 'Bihari', de: 'Bihari', it: 'Bihari', es: 'Bihari', code: 'bh' },
    'bi': { fr: 'Bislama', en: 'Bislama', de: 'Bislama', it: 'Bislama', es: 'Bislama', code: 'bi' },
    'bm': { fr: 'Bambara', en: 'Bambara', de: 'Bambara', it: 'Bambara', es: 'Bambara', code: 'bm' },
    'bn': { fr: 'Bengali', en: 'Bengali', de: 'Bengalisch', it: 'Bengalese', es: 'Bengalí', code: 'bn' },
    'bo': { fr: 'Tibétain', en: 'Tibetan', de: 'Tibetisch', it: 'Tibetano', es: 'Tibetano', code: 'bo' },
    'br': { fr: 'Breton', en: 'Breton', de: 'Bretonisch', it: 'Bretone', es: 'Bretón', code: 'br' },
    'bs': { fr: 'Bosniaque', en: 'Bosnian', de: 'Bosnisch', it: 'Bosniaco', es: 'Bosnio', code: 'bs' },
    'ca': { fr: 'Catalan', en: 'Catalan', de: 'Katalanisch', it: 'Catalano', es: 'Catalán', code: 'ca' },
    'ce': { fr: 'Tchétchène', en: 'Chechen', de: 'Tschetschenisch', it: 'Ceceno', es: 'Checheno', code: 'ce' },
    'ch': { fr: 'Chamorro', en: 'Chamorro', de: 'Chamorro', it: 'Chamorro', es: 'Chamorro', code: 'ch' },
    'co': { fr: 'Corse', en: 'Corsican', de: 'Korsisch', it: 'Corso', es: 'Corso', code: 'co' },
    'cr': { fr: 'Cree', en: 'Cree', de: 'Cree', it: 'Cree', es: 'Cree', code: 'cr' },
    'cs': { fr: 'Tchèque', en: 'Czech', de: 'Tschechisch', it: 'Ceco', es: 'Checo', code: 'cs' },
    'cu': { fr: 'Slavon', en: 'Church Slavic', de: 'Kirchenslawisch', it: 'Slavo ecclesiastico', es: 'Eslavo eclesiástico', code: 'cu' },
    'cv': { fr: 'Tchouvache', en: 'Chuvash', de: 'Tschuwaschisch', it: 'Ciuvascio', es: 'Chuvasio', code: 'cv' },
    'cy': { fr: 'Gallois', en: 'Welsh', de: 'Walisisch', it: 'Gallese', es: 'Galés', code: 'cy' },
    'da': { fr: 'Danois', en: 'Danish', de: 'Dänisch', it: 'Danese', es: 'Danés', code: 'da' },
    'de': { fr: 'Allemand', en: 'German', de: 'Deutsch', it: 'Tedesco', es: 'Alemán', code: 'de' },
    'dv': { fr: 'Maldivien', en: 'Divehi', de: 'Maledivisch', it: 'Maldiviano', es: 'Maldivo', code: 'dv' },
    'dz': { fr: 'Dzongkha', en: 'Dzongkha', de: 'Dzongkha', it: 'Dzongkha', es: 'Dzongkha', code: 'dz' },
    'ee': { fr: 'Ewe', en: 'Ewe', de: 'Ewe', it: 'Ewe', es: 'Ewe', code: 'ee' },
    'el': { fr: 'Grec', en: 'Greek', de: 'Griechisch', it: 'Greco', es: 'Griego', code: 'el' },
    'en': { fr: 'Anglais', en: 'English', de: 'Englisch', it: 'Inglese', es: 'Inglés', code: 'en' },
    'eo': { fr: 'Espéranto', en: 'Esperanto', de: 'Esperanto', it: 'Esperanto', es: 'Esperanto', code: 'eo' },
    'es': { fr: 'Espagnol', en: 'Spanish', de: 'Spanisch', it: 'Spagnolo', es: 'Español', code: 'es' },
    'et': { fr: 'Estonien', en: 'Estonian', de: 'Estnisch', it: 'Estone', es: 'Estonio', code: 'et' },
    'eu': { fr: 'Basque', en: 'Basque', de: 'Baskisch', it: 'Basco', es: 'Euskera', code: 'eu' },
    'fa': { fr: 'Persan', en: 'Persian', de: 'Persisch', it: 'Persiano', es: 'Persa', code: 'fa' },
    'ff': { fr: 'Peul', en: 'Fulah', de: 'Ful', it: 'Fula', es: 'Fula', code: 'ff' },
    'fi': { fr: 'Finnois', en: 'Finnish', de: 'Finnisch', it: 'Finlandese', es: 'Finés', code: 'fi' },
    'fj': { fr: 'Fidjien', en: 'Fijian', de: 'Fidschi', it: 'Figiano', es: 'Fiyiano', code: 'fj' },
    'fo': { fr: 'Féroïen', en: 'Faroese', de: 'Färöisch', it: 'Faroese', es: 'Feroés', code: 'fo' },
    'fr': { fr: 'Français', en: 'French', de: 'Französisch', it: 'Francese', es: 'Francés', code: 'fr' },
    'fy': { fr: 'Frison', en: 'Western Frisian', de: 'Westfriesisch', it: 'Frisone occidentale', es: 'Frisón occidental', code: 'fy' },
    'ga': { fr: 'Irlandais', en: 'Irish', de: 'Irisch', it: 'Irlandese', es: 'Irlandés', code: 'ga' },
    'gd': { fr: 'Gaélique écossais', en: 'Scottish Gaelic', de: 'Schottisch-Gälisch', it: 'Gaelico scozzese', es: 'Gaélico escocés', code: 'gd' },
    'gl': { fr: 'Galicien', en: 'Galician', de: 'Galicisch', it: 'Galiziano', es: 'Gallego', code: 'gl' },
    'gn': { fr: 'Guarani', en: 'Guaraní', de: 'Guaraní', it: 'Guaraní', es: 'Guaraní', code: 'gn' },
    'gu': { fr: 'Gujarati', en: 'Gujarati', de: 'Gujarati', it: 'Gujarati', es: 'Gujarati', code: 'gu' },
    'gv': { fr: 'Mannois', en: 'Manx', de: 'Manx', it: 'Mannese', es: 'Manés', code: 'gv' },
    'ha': { fr: 'Haoussa', en: 'Hausa', de: 'Hausa', it: 'Hausa', es: 'Hausa', code: 'ha' },
    'he': { fr: 'Hébreu', en: 'Hebrew', de: 'Hebräisch', it: 'Ebraico', es: 'Hebreo', code: 'he' },
    'hi': { fr: 'Hindi', en: 'Hindi', de: 'Hindi', it: 'Hindi', es: 'Hindi', code: 'hi' },
    'ho': { fr: 'Hiri Motu', en: 'Hiri Motu', de: 'Hiri Motu', it: 'Hiri Motu', es: 'Hiri Motu', code: 'ho' },
    'hr': { fr: 'Croate', en: 'Croatian', de: 'Kroatisch', it: 'Croato', es: 'Croata', code: 'hr' },
    'ht': { fr: 'Créole haïtien', en: 'Haitian', de: 'Haitianisch', it: 'Creolo haitiano', es: 'Criollo haitiano', code: 'ht' },
    'hu': { fr: 'Hongrois', en: 'Hungarian', de: 'Ungarisch', it: 'Ungherese', es: 'Húngaro', code: 'hu' },
    'hy': { fr: 'Arménien', en: 'Armenian', de: 'Armenisch', it: 'Armeno', es: 'Armenio', code: 'hy' },
    'hz': { fr: 'Hereró', en: 'Herero', de: 'Herero', it: 'Herero', es: 'Herero', code: 'hz' },
    'ia': { fr: 'Interlingua', en: 'Interlingua', de: 'Interlingua', it: 'Interlingua', es: 'Interlingua', code: 'ia' },
    'id': { fr: 'Indonésien', en: 'Indonesian', de: 'Indonesisch', it: 'Indonesiano', es: 'Indonesio', code: 'id' },
    'ie': { fr: 'Interlingue', en: 'Interlingue', de: 'Interlingue', it: 'Interlingue', es: 'Interlingue', code: 'ie' },
    'ig': { fr: 'Igbo', en: 'Igbo', de: 'Igbo', it: 'Igbo', es: 'Igbo', code: 'ig' },
    'ii': { fr: 'Yi', en: 'Sichuan Yi', de: 'Yi', it: 'Yi', es: 'Yi', code: 'ii' },
    'ik': { fr: 'Inupiaq', en: 'Inupiaq', de: 'Inupiaq', it: 'Inupiaq', es: 'Inupiaq', code: 'ik' },
    'io': { fr: 'Ido', en: 'Ido', de: 'Ido', it: 'Ido', es: 'Ido', code: 'io' },
    'is': { fr: 'Islandais', en: 'Icelandic', de: 'Isländisch', it: 'Islandese', es: 'Islandés', code: 'is' },
    'it': { fr: 'Italien', en: 'Italian', de: 'Italienisch', it: 'Italiano', es: 'Italiano', code: 'it' },
    'iu': { fr: 'Inuktitut', en: 'Inuktitut', de: 'Inuktitut', it: 'Inuktitut', es: 'Inuktitut', code: 'iu' },
    'ja': { fr: 'Japonais', en: 'Japanese', de: 'Japanisch', it: 'Giapponese', es: 'Japonés', code: 'ja' },
    'ji': { fr: 'Yiddish', en: 'Yiddish', de: 'Jiddisch', it: 'Yiddish', es: 'Yidis', code: 'ji' },
    'jv': { fr: 'Javanais', en: 'Javanese', de: 'Javanisch', it: 'Giavanese', es: 'Javanés', code: 'jv' },
    'ka': { fr: 'Géorgien', en: 'Georgian', de: 'Georgisch', it: 'Georgiano', es: 'Georgiano', code: 'ka' },
    'kg': { fr: 'Kongo', en: 'Kongo', de: 'Kongo', it: 'Kongo', es: 'Kongo', code: 'kg' },
    'ki': { fr: 'Kikuyu', en: 'Kikuyu', de: 'Kikuyu', it: 'Kikuyu', es: 'Kikuyu', code: 'ki' },
    'kj': { fr: 'Kuanyama', en: 'Kwanyama', de: 'Kwanyama', it: 'Kwanyama', es: 'Kwanyama', code: 'kj' },
    'kk': { fr: 'Kazakh', en: 'Kazakh', de: 'Kasachisch', it: 'Kazako', es: 'Kazajo', code: 'kk' },
    'kl': { fr: 'Groenlandais', en: 'Kalaallisut', de: 'Grönländisch', it: 'Groenlandese', es: 'Groenlandés', code: 'kl' },
    'km': { fr: 'Khmer', en: 'Khmer', de: 'Khmer', it: 'Khmer', es: 'Jemer', code: 'km' },
    'kn': { fr: 'Kannada', en: 'Kannada', de: 'Kannada', it: 'Kannada', es: 'Canarés', code: 'kn' },
    'ko': { fr: 'Coréen', en: 'Korean', de: 'Koreanisch', it: 'Coreano', es: 'Coreano', code: 'ko' },
    'kr': { fr: 'Kanouri', en: 'Kanuri', de: 'Kanuri', it: 'Kanuri', es: 'Kanuri', code: 'kr' },
    'ks': { fr: 'Kashmiri', en: 'Kashmiri', de: 'Kashmiri', it: 'Kashmiri', es: 'Cachemiro', code: 'ks' },
    'ku': { fr: 'Kurde', en: 'Kurdish', de: 'Kurdisch', it: 'Curdo', es: 'Kurdo', code: 'ku' },
    'kv': { fr: 'Komi', en: 'Komi', de: 'Komi', it: 'Komi', es: 'Komi', code: 'kv' },
    'kw': { fr: 'Cornique', en: 'Cornish', de: 'Kornisch', it: 'Cornico', es: 'Córnico', code: 'kw' },
    'ky': { fr: 'Kirghiz', en: 'Kyrgyz', de: 'Kirgisisch', it: 'Kirghiso', es: 'Kirguís', code: 'ky' },
    'la': { fr: 'Latin', en: 'Latin', de: 'Lateinisch', it: 'Latino', es: 'Latín', code: 'la' },
    'lb': { fr: 'Luxembourgeois', en: 'Luxembourgish', de: 'Luxemburgisch', it: 'Lussemburghese', es: 'Luxemburgués', code: 'lb' },
    'lg': { fr: 'Ganda', en: 'Ganda', de: 'Ganda', it: 'Ganda', es: 'Ganda', code: 'lg' },
    'li': { fr: 'Limbourgeois', en: 'Limburgish', de: 'Limburgisch', it: 'Limburghese', es: 'Limburgués', code: 'li' },
    'ln': { fr: 'Lingala', en: 'Lingala', de: 'Lingala', it: 'Lingala', es: 'Lingala', code: 'ln' },
    'lo': { fr: 'Lao', en: 'Lao', de: 'Laotisch', it: 'Lao', es: 'Lao', code: 'lo' },
    'lt': { fr: 'Lituanien', en: 'Lithuanian', de: 'Litauisch', it: 'Lituano', es: 'Lituano', code: 'lt' },
    'lu': { fr: 'Luba-Katanga', en: 'Luba-Katanga', de: 'Luba-Katanga', it: 'Luba-Katanga', es: 'Luba-Katanga', code: 'lu' },
    'lv': { fr: 'Letton', en: 'Latvian', de: 'Lettisch', it: 'Lettone', es: 'Letón', code: 'lv' },
    'mg': { fr: 'Malgache', en: 'Malagasy', de: 'Madagassisch', it: 'Malgascio', es: 'Malgache', code: 'mg' },
    'mh': { fr: 'Marshallais', en: 'Marshallese', de: 'Marshallisch', it: 'Marshallese', es: 'Marshalés', code: 'mh' },
    'mi': { fr: 'Māori', en: 'Māori', de: 'Māori', it: 'Māori', es: 'Maorí', code: 'mi' },
    'mk': { fr: 'Macédonien', en: 'Macedonian', de: 'Mazedonisch', it: 'Macedone', es: 'Macedonio', code: 'mk' },
    'ml': { fr: 'Malayalam', en: 'Malayalam', de: 'Malayalam', it: 'Malayalam', es: 'Malabar', code: 'ml' },
    'mn': { fr: 'Mongol', en: 'Mongolian', de: 'Mongolisch', it: 'Mongolo', es: 'Mongol', code: 'mn' },
    'mr': { fr: 'Marathi', en: 'Marathi', de: 'Marathi', it: 'Marathi', es: 'Maratí', code: 'mr' },
    'ms': { fr: 'Malais', en: 'Malay', de: 'Malaiisch', it: 'Malese', es: 'Malayo', code: 'ms' },
    'mt': { fr: 'Maltais', en: 'Maltese', de: 'Maltesisch', it: 'Maltese', es: 'Maltés', code: 'mt' },
    'my': { fr: 'Birman', en: 'Burmese', de: 'Birmanisch', it: 'Birmano', es: 'Birmano', code: 'my' },
    'na': { fr: 'Nauruan', en: 'Nauru', de: 'Nauruisch', it: 'Nauru', es: 'Nauru', code: 'na' },
    'nb': { fr: 'Norvégien bokmål', en: 'Norwegian Bokmål', de: 'Norwegisch Bokmål', it: 'Norvegese bokmål', es: 'Noruego bokmål', code: 'nb' },
    'nd': { fr: 'Ndébélé du Nord', en: 'North Ndebele', de: 'Nord-Ndebele', it: 'Ndebele del nord', es: 'Ndebele del norte', code: 'nd' },
    'ne': { fr: 'Népalais', en: 'Nepali', de: 'Nepalesisch', it: 'Nepalese', es: 'Nepalí', code: 'ne' },
    'ng': { fr: 'Ndonga', en: 'Ndonga', de: 'Ndonga', it: 'Ndonga', es: 'Ndonga', code: 'ng' },
    'nl': { fr: 'Néerlandais', en: 'Dutch', de: 'Niederländisch', it: 'Olandese', es: 'Neerlandés', code: 'nl' },
    'nn': { fr: 'Norvégien nynorsk', en: 'Norwegian Nynorsk', de: 'Norwegisch Nynorsk', it: 'Norvegese nynorsk', es: 'Noruego nynorsk', code: 'nn' },
    'no': { fr: 'Norvégien', en: 'Norwegian', de: 'Norwegisch', it: 'Norvegese', es: 'Noruego', code: 'no' },
    'nr': { fr: 'Ndébélé du Sud', en: 'South Ndebele', de: 'Süd-Ndebele', it: 'Ndebele del sud', es: 'Ndebele del sur', code: 'nr' },
    'nv': { fr: 'Navajo', en: 'Navajo', de: 'Navajo', it: 'Navajo', es: 'Navajo', code: 'nv' },
    'ny': { fr: 'Chewa', en: 'Chichewa', de: 'Chichewa', it: 'Chichewa', es: 'Chichewa', code: 'ny' },
    'oc': { fr: 'Occitan', en: 'Occitan', de: 'Okzitanisch', it: 'Occitano', es: 'Occitano', code: 'oc' },
    'oj': { fr: 'Ojibwé', en: 'Ojibwe', de: 'Ojibwe', it: 'Ojibwe', es: 'Ojibwe', code: 'oj' },
    'om': { fr: 'Oromo', en: 'Oromo', de: 'Oromo', it: 'Oromo', es: 'Oromo', code: 'om' },
    'or': { fr: 'Oriya', en: 'Oriya', de: 'Oriya', it: 'Oriya', es: 'Oriya', code: 'or' },
    'os': { fr: 'Ossète', en: 'Ossetian', de: 'Ossetisch', it: 'Osseto', es: 'Osetio', code: 'os' },
    'pa': { fr: 'Pendjabi', en: 'Panjabi', de: 'Panjabi', it: 'Punjabi', es: 'Punyabí', code: 'pa' },
    'pi': { fr: 'Pāli', en: 'Pāli', de: 'Pali', it: 'Pali', es: 'Pali', code: 'pi' },
    'pl': { fr: 'Polonais', en: 'Polish', de: 'Polnisch', it: 'Polacco', es: 'Polaco', code: 'pl' },
    'ps': { fr: 'Pachto', en: 'Pashto', de: 'Paschtu', it: 'Pashto', es: 'Pastún', code: 'ps' },
    'pt': { fr: 'Portugais', en: 'Portuguese', de: 'Portugiesisch', it: 'Portoghese', es: 'Portugués', code: 'pt' },
    'qu': { fr: 'Quechua', en: 'Quechua', de: 'Quechua', it: 'Quechua', es: 'Quechua', code: 'qu' },
    'rm': { fr: 'Romanche', en: 'Romansh', de: 'Rätoromanisch', it: 'Romancio', es: 'Romanche', code: 'rm' },
    'rn': { fr: 'Kirundi', en: 'Rundi', de: 'Kirundi', it: 'Kirundi', es: 'Kirundi', code: 'rn' },
    'ro': { fr: 'Roumain', en: 'Romanian', de: 'Rumänisch', it: 'Rumeno', es: 'Rumano', code: 'ro' },
    'ru': { fr: 'Russe', en: 'Russian', de: 'Russisch', it: 'Russo', es: 'Ruso', code: 'ru' },
    'rw': { fr: 'Kinyarwanda', en: 'Kinyarwanda', de: 'Kinyarwanda', it: 'Kinyarwanda', es: 'Kinyarwanda', code: 'rw' },
    'sa': { fr: 'Sanskrit', en: 'Sanskrit', de: 'Sanskrit', it: 'Sanscrito', es: 'Sánscrito', code: 'sa' },
    'sb': { fr: 'Sorabe du haut', en: 'Upper Sorbian', de: 'Obersorbisch', it: 'Sorabo superiore', es: 'Sorabo superior', code: 'sb' },
    'sc': { fr: 'Sarde', en: 'Sardinian', de: 'Sardisch', it: 'Sardo', es: 'Sardo', code: 'sc' },
    'sd': { fr: 'Sindhi', en: 'Sindhi', de: 'Sindhi', it: 'Sindhi', es: 'Sindhi', code: 'sd' },
    'se': { fr: 'Sami du Nord', en: 'Northern Sami', de: 'Nordsamisch', it: 'Sami del nord', es: 'Sami del norte', code: 'se' },
    'sg': { fr: 'Sango', en: 'Sango', de: 'Sango', it: 'Sango', es: 'Sango', code: 'sg' },
    'si': { fr: 'Cingalais', en: 'Sinhala', de: 'Singhalesisch', it: 'Singalese', es: 'Cingalés', code: 'si' },
    'sk': { fr: 'Slovaque', en: 'Slovak', de: 'Slowakisch', it: 'Slovacco', es: 'Eslovaco', code: 'sk' },
    'sl': { fr: 'Slovène', en: 'Slovenian', de: 'Slowenisch', it: 'Sloveno', es: 'Esloveno', code: 'sl' },
    'sm': { fr: 'Samoan', en: 'Samoan', de: 'Samoanisch', it: 'Samoano', es: 'Samoano', code: 'sm' },
    'sn': { fr: 'Shona', en: 'Shona', de: 'Shona', it: 'Shona', es: 'Shona', code: 'sn' },
    'so': { fr: 'Somali', en: 'Somali', de: 'Somali', it: 'Somalo', es: 'Somalí', code: 'so' },
    'sq': { fr: 'Albanais', en: 'Albanian', de: 'Albanisch', it: 'Albanese', es: 'Albanés', code: 'sq' },
    'sr': { fr: 'Serbe', en: 'Serbian', de: 'Serbisch', it: 'Serbo', es: 'Serbio', code: 'sr' },
    'ss': { fr: 'Swati', en: 'Swati', de: 'Swati', it: 'Swati', es: 'Swati', code: 'ss' },
    'st': { fr: 'Sotho du Sud', en: 'Southern Sotho', de: 'Süd-Sotho', it: 'Sotho del sud', es: 'Sotho del sur', code: 'st' },
    'su': { fr: 'Soundanais', en: 'Sundanese', de: 'Sundanesisch', it: 'Sundanese', es: 'Sundanés', code: 'su' },
    'sv': { fr: 'Suédois', en: 'Swedish', de: 'Schwedisch', it: 'Svedese', es: 'Sueco', code: 'sv' },
    'sw': { fr: 'Swahili', en: 'Swahili', de: 'Swahili', it: 'Swahili', es: 'Suajili', code: 'sw' },
    'ta': { fr: 'Tamoul', en: 'Tamil', de: 'Tamilisch', it: 'Tamil', es: 'Tamil', code: 'ta' },
    'te': { fr: 'Télougou', en: 'Telugu', de: 'Telugu', it: 'Telugu', es: 'Telugu', code: 'te' },
    'tg': { fr: 'Tadjik', en: 'Tajik', de: 'Tadschikisch', it: 'Tagiko', es: 'Tayiko', code: 'tg' },
    'th': { fr: 'Thaï', en: 'Thai', de: 'Thailändisch', it: 'Thai', es: 'Tailandés', code: 'th' },
    'ti': { fr: 'Tigrinya', en: 'Tigrinya', de: 'Tigrinya', it: 'Tigrinya', es: 'Tigriña', code: 'ti' },
    'tk': { fr: 'Turkmène', en: 'Turkmen', de: 'Turkmenisch', it: 'Turkmeno', es: 'Turcomano', code: 'tk' },
    'tl': { fr: 'Tagalog', en: 'Tagalog', de: 'Tagalog', it: 'Tagalog', es: 'Tagalo', code: 'tl' },
    'tn': { fr: 'Tswana', en: 'Tswana', de: 'Tswana', it: 'Tswana', es: 'Setsuana', code: 'tn' },
    'to': { fr: 'Tongien', en: 'Tonga', de: 'Tongaisch', it: 'Tongano', es: 'Tongano', code: 'to' },
    'tr': { fr: 'Turc', en: 'Turkish', de: 'Türkisch', it: 'Turco', es: 'Turco', code: 'tr' },
    'ts': { fr: 'Tsonga', en: 'Tsonga', de: 'Tsonga', it: 'Tsonga', es: 'Tsonga', code: 'ts' },
    'tt': { fr: 'Tatar', en: 'Tatar', de: 'Tatarisch', it: 'Tataro', es: 'Tártaro', code: 'tt' },
    'tw': { fr: 'Twi', en: 'Twi', de: 'Twi', it: 'Twi', es: 'Twi', code: 'tw' },
    'ty': { fr: 'Tahitien', en: 'Tahitian', de: 'Tahitisch', it: 'Tahitiano', es: 'Tahitiano', code: 'ty' },
    'ug': { fr: 'Ouïghour', en: 'Uighur', de: 'Uigurisch', it: 'Uiguro', es: 'Uigur', code: 'ug' },
    'uk': { fr: 'Ukrainien', en: 'Ukrainian', de: 'Ukrainisch', it: 'Ucraino', es: 'Ucraniano', code: 'uk' },
    'ur': { fr: 'Ourdou', en: 'Urdu', de: 'Urdu', it: 'Urdu', es: 'Urdu', code: 'ur' },
    'uz': { fr: 'Ouzbek', en: 'Uzbek', de: 'Usbekisch', it: 'Uzbeco', es: 'Uzbeko', code: 'uz' },
    'val': { fr: 'Valencien', en: 'Valencian', de: 'Valencianisch', it: 'Valenciano', es: 'Valenciano', code: 'val' },
    've': { fr: 'Venda', en: 'Venda', de: 'Venda', it: 'Venda', es: 'Venda', code: 've' },
    'vi': { fr: 'Vietnamien', en: 'Vietnamese', de: 'Vietnamesisch', it: 'Vietnamita', es: 'Vietnamita', code: 'vi' },
    'vo': { fr: 'Volapük', en: 'Volapük', de: 'Volapük', it: 'Volapük', es: 'Volapük', code: 'vo' },
    'wa': { fr: 'Wallon', en: 'Walloon', de: 'Wallonisch', it: 'Vallone', es: 'Valón', code: 'wa' },
    'wo': { fr: 'Wolof', en: 'Wolof', de: 'Wolof', it: 'Wolof', es: 'Wolof', code: 'wo' },
    'xh': { fr: 'Xhosa', en: 'Xhosa', de: 'Xhosa', it: 'Xhosa', es: 'Xhosa', code: 'xh' },
    'yi': { fr: 'Yiddish', en: 'Yiddish', de: 'Jiddisch', it: 'Yiddish', es: 'Yidis', code: 'yi' },
    'yo': { fr: 'Yoruba', en: 'Yoruba', de: 'Yoruba', it: 'Yoruba', es: 'Yoruba', code: 'yo' },
    'za': { fr: 'Zhuang', en: 'Zhuang', de: 'Zhuang', it: 'Zhuang', es: 'Zhuang', code: 'za' },
    'zh': { fr: 'Chinois', en: 'Chinese', de: 'Chinesisch', it: 'Cinese', es: 'Chino', code: 'zh' },
    'zu': { fr: 'Zoulou', en: 'Zulu', de: 'Zulu', it: 'Zulu', es: 'Zulú', code: 'zu' }
};

let allLanguages = Object.keys(allLangCodes).map(code => {
    return {
        ...allLangCodes[code]
    };
});

i18nService.getVueI18n = async function () {
    if (vueI18n) {
        return vueI18n;
    }
    vueI18n = new VueI18n({
        locale: i18nService.getAppLang(), // set locale
        fallbackLocale: fallbackLang,
        messages: {}
    });
    await loadLanguage(fallbackLang);
    getUserSettings();
    return i18nService.setAppLanguage(i18nService.getAppLang(), true).then(() => {
        return Promise.resolve(vueI18n);
    });
};

i18nService.getBrowserLang = function () {
    // Vérifier si une des langues préférées du navigateur est supportée
    if (navigator.languages && navigator.languages.length) {
        for (const lang of navigator.languages) {
            const baseLang = lang.substring(0, 2).toLowerCase();
            if (appLanguages.includes(baseLang)) {
                return baseLang;
            }
        }
    }
    
    // Vérifier la langue principale du navigateur
    const mainBrowserLang = navigator.language.substring(0, 2).toLowerCase();
    if (appLanguages.includes(mainBrowserLang)) {
        return mainBrowserLang;
    }
    
    // Si aucune des langues du navigateur n'est supportée, utiliser l'anglais
    return 'en';
};

i18nService.getContentLang = function () {
    return currentContentLang || i18nService.getAppLang();
};

/**
 * returns the current content language, but without country code, e.g. "de" if content lang is "de-at"
 * @return {string|*}
 */
i18nService.getContentLangBase = function () {
    return i18nService.getBaseLang(i18nService.getContentLang());
};

i18nService.getContentLangReadable = function () {
    return i18nService.getLangReadable(i18nService.getContentLang());
};

i18nService.getAppLang = function () {
    return i18nService.getCustomAppLang() || i18nService.getBrowserLang();
};

i18nService.getCustomAppLang = function () {
    return currentAppLang || '';
};


/****
i18nService.isCurrentAppLangDE = function () {
    return i18nService.getAppLang() === 'de';
};

i18nService.isCurrentAppLangEN = function () {
    return i18nService.getAppLang() === 'en';
};
*/
/**
 * sets the language code to use (ISO 639-1)
 * @param lang two-letter language code to use
 * @param dontSave if true, passed lang is not saved to local storage
 */
i18nService.setAppLanguage = function (lang, dontSave) {
    if (!dontSave) {
        localStorageService.saveAppSettings({appLang: lang});
    }
    currentAppLang = lang || i18nService.getBrowserLang();
    $('html').prop('lang', currentAppLang);
    return loadLanguage(currentAppLang).then(() => {
        vueI18n.locale = currentAppLang;
        allLanguages.sort((a, b) => a[currentAppLang].toLowerCase().localeCompare(b[currentAppLang].toLowerCase()));
        return Promise.resolve();
    });
};

i18nService.setContentLanguage = async function (lang, dontSave) {
    currentContentLang = lang || undefined;
    if (!dontSave) {
        localStorageService.saveUserSettings({contentLang: currentContentLang})
    }
    return loadLanguage(i18nService.getContentLangBase()); // use promise for return!
};

/**
 * retrieves array of all languages, ordered by translation of current user language
 * @return {any} array in format [{de: "Deutsch", en: "German", code: "de"}, ...]
 */
i18nService.getAllLanguages = function () {
    return JSON.parse(JSON.stringify(allLanguages));
};

i18nService.getAllLangCodes = function() {
    return i18nService.getAllLanguages().map(lang => lang.code);
}

/**
 * retrieves existing app languages translated via crowdin.com
 * @return {any}
 */
i18nService.getAppLanguages = function () {
    return JSON.parse(JSON.stringify(appLanguages));
};

/**
 * gets translation of the given language (e.g. "English")
 * @param lang language code, either only 2 digits (e.g. "en") or localized (e.g. "en-us")
 * @returns {*}
 */
i18nService.getLangReadable = function (lang) {
    let baseLang = i18nService.getBaseLang(lang);
    let langObject = allLanguages.find(object => object.code === lang);
    let baselangObject = allLanguages.find(object => object.code === baseLang) || {};

    return langObject ? langObject[i18nService.getAppLang()] : baselangObject[i18nService.getAppLang()];
};

/**
 * get app translation for the given key in the current app language
 * @param key
 * @param args optional arguments for placeholders within the translation
 * @return {*}
 */
i18nService.t = function (key, ...args) {
    return vueI18n.t(key, i18nService.getAppLang(), args);
};

/**
 * checks if translation exists
 * @param key
 * @return true, if translations exists
 */
i18nService.te = function (key) {
    return vueI18n.te(key, i18nService.getAppLang());
}

/**
 * returns the translation of the first existing given translation key. If no translation is existing, the last
 * key is returned.
 * @param keys
 * @returns {*|string}
 */
i18nService.tFallback = function(...keys) {
    for (let key of keys) {
        if (i18nService.te(key)) {
            return i18nService.t(key);
        }
    }
    return keys.length > 0 ? keys[keys.length - 1] : '';
};

/**
 * get app translation for the given key in the given language
 * @param key
 * @param args optional arguments for placeholders within the translation
 * @param lang target language
 * @return {*}
 */
i18nService.tl = function (key, args, lang) {
    return vueI18n.t(key, lang, args);
};

/**
 * translates a key, but loads current language before translating
 * @param key
 * @returns {Promise<*>}
 */
i18nService.tLoad = async function(key) {
    await loadLanguage(i18nService.getAppLang());
    return i18nService.t(key);
};

/**
 * get plain translation string from an translation object
 * @param i18nObject translation object, e.g. {en: 'english text', de: 'deutscher Text'}
 * @param options
 * @param options.fallbackLang language to use if current browser language not available, default: 'en'
 * @param options.includeLang if true return format is {lang: <languageCode>, text: <translatedText>}
 * @param options.lang language in which the translation is forced to be returned (if available), no exact matching, so "en-us" also matches for "en"
 * @param options.forceLang exact language in which the translation is forced to be returned (if available), exact matching, so "en-us" doesn't match for "en"
 * @param options.noFallback if true nothing is returned if the current content lang / force lang isn't existing in the
 *                           translation object
 * @return {string|*|string} the translated string in current browser language, e.g. 'english text'
 */
i18nService.getTranslation = function (i18nObject, options = {}) {
    if (!i18nObject) {
        return '';
    }
    options.lang = options.lang || '';
    let lang = options.forceLang || options.lang || i18nService.getContentLang();
    let baseLang = options.forceLang || i18nService.getBaseLang(options.lang) || i18nService.getContentLangBase();
    options.fallbackLang = options.fallbackLang || 'en';
    if (typeof i18nObject === 'string') {
        return i18nService.t(i18nObject);
    }
    if (i18nObject[lang]) {
        return !options.includeLang ? i18nObject[lang] : { lang: lang, text: i18nObject[lang] };
    }
    if (i18nObject[baseLang]) {
        return !options.includeLang ? i18nObject[baseLang] : {
            lang: baseLang,
            text: i18nObject[baseLang]
        };
    }

    if (!options.noFallback) {
        if (i18nObject[options.fallbackLang]) {
            return !options.includeLang
                ? `${i18nObject[options.fallbackLang]}`
                : { lang: options.fallbackLang, text: `${i18nObject[options.fallbackLang]}` };
        }

        let keys = Object.keys(i18nObject);
        for (let key of keys) {
            if (i18nObject[key]) {
                return !options.includeLang ? `${i18nObject[key]}` : { lang: key, text: `${i18nObject[key]}` };
            }
        }
    }

    return !options.includeLang ? '' : { lang: undefined, text: '' };
};

i18nService.getTranslationAppLang = function (i18nObject) {
    return i18nService.getTranslation(i18nObject, { forceLang: i18nService.getAppLang() });
};

/**
 * turns a given label to a translation object
 * @param label plain string label
 * @param locale locale of the string (2 chars, ISO 639-1)
 * @return translation object, e.g. {en: 'given label'}
 */
i18nService.getTranslationObject = function (label, locale) {
    locale = locale || i18nService.getContentLang();
    let object = {};
    object[locale] = label;
    return object;
};

/**
 * returns the base lang code of a localized language code including a country code.
 * e.g. for "en-us" the base lang is "en"
 *
 * @param langCode
 * @returns {string|*}
 */
i18nService.getBaseLang = function(langCode = '') {
    // not using simple substring(0,2) because there is also "val" (Valencian) as base lang
    let delimiterIndex = langCode.search(/[^A-Za-z]/); // index of first non-alphabetic character (= delimiter, "dash" in most cases)
    return delimiterIndex !== -1 ? langCode.substring(0, delimiterIndex) : langCode;
}

/**
 * get country code from a language code
 * e.g. "en-us" => country code is "us"
 *
 * @param langCode
 * @returns {string|*}
 */
i18nService.getCountryCode = function(langCode) {
    let delimiterIndex = langCode.search(/[^A-Za-z]/); // index of first non-alphabetic character (= delimiter, "dash" in most cases)
    return delimiterIndex !== -1 ? langCode.substring(delimiterIndex + 1) : '';
};

async function loadLanguage(useLang, secondTry) {
    if (!useLang || loadedLanguages.includes(useLang)) {
        return;
    }
    let url = 'lang/i18n.' + useLang + '.json';
    try {
        let messages = await $.get(url);
        loadedLanguages.push(useLang);
        vueI18n.setLocaleMessage(useLang, messages);
    } catch (e) {
        if (!secondTry) {
            await loadLanguage(fallbackLang, true);
        }
        return;
    }
    allLanguages.forEach((elem) => {
        if (!elem[useLang]) {
            let langCode = i18nService.getBaseLang(elem.code);
            let countryCode = i18nService.getCountryCode(elem.code);
            elem[useLang] = i18nService.tl(`lang.${langCode}`, [], useLang);
            if (countryCode) {
                elem[useLang] = `${elem[useLang]}, ${i18nService.tl(`country.${countryCode}`, [], useLang)}`
            }
        }
    });
    let module = await import("./serviceWorkerService.js");
    module.serviceWorkerService.cacheUrl(url);
}

async function getUserSettings() {
    let userSettings = localStorageService.getUserSettings();
    currentContentLang = userSettings.contentLang;
    loadLanguage(i18nService.getContentLangBase());
}

$(document).on(constants.EVENT_USER_CHANGED, getUserSettings);

export { i18nService };
