import $ from '../../externals/jquery.js';

import { urlParamService } from '../urlParamService';
import { MetaData } from '../../model/MetaData';
import { encryptionService } from './encryptionService';
import { pouchDbService } from './pouchDbService';
import { convertServiceDb } from './convertServiceDb';
import { localStorageService } from './localStorageService';
import { util } from '../../util/util';
import { constants } from '../../util/constants';
import { log } from '../../util/log';
import { MapCache } from '../../util/MapCache';
import superlogin from 'superlogin-client';

let databaseService = {};

let _initPromise = null;
let _lastDataModelVersion = null;

let _documentCache = new MapCache();
/**
 * queries for objects in database and resolves promise with result.
 * If no elements are found 'null' is resolved, if exactly one element was found, this element is resolved,
 * otherwise an array of the found elements is resolved.
 *
 * @param objectType the objectType to find, e.g. GridData, given as real object, not as string
 * @param id the id of the object to find (optional)
 * @param onlyShortVersion if true only the short version (with stripped binary data) is returned (optional)
 * @return {Promise}
 */
databaseService.getObject = function (objectType, id, onlyShortVersion) {
    if (!_initPromise) {
        return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
        _initPromise.then(() => {
            if (!objectType.getIdPrefix) {
                log.warn('missing method getIdPrefix() in allObjects()');
                return reject();
            }
            pouchDbService
                .all(objectType.getIdPrefix(), id)
                .then((result) => {
                    let options = {
                        objectType: objectType,
                        onlyShortVersion: onlyShortVersion
                    };
                    let filteredData = convertServiceDb.convertDatabaseToLiveObjects(result, options);
                    let modelVersion = getModelVersion(filteredData);
                    if (modelVersion && _lastDataModelVersion !== modelVersion) {
                        _lastDataModelVersion = modelVersion;
                        localStorageService.setUserModelVersion(pouchDbService.getOpenedDatabaseName(), modelVersion);
                    }
                    resolve(filteredData);
                })
                .catch((reason) => {
                    reject(reason);
                });
        });
    });
};

/**
 * same as databaseService.getObject(), but the result is returned as single object or null, if no object was found.
 * @param objectType
 * @param id
 * @param onlyShortVersion
 */
databaseService.getSingleObject = function (objectType, id, onlyShortVersion) {
    return databaseService.getObject(objectType, id, onlyShortVersion).then((result) => {
        return Promise.resolve(result instanceof Array ? result[0] : result);
    });
};

/**
 * Saves an object to database.
 *
 * @param objectType the objectType to save, e.g. "GridData"
 * @param data the data object to save, must be valid object, not only single properties to update
 * @param onlyUpdate if true no new object is created but only an existing updated. If onlyUpdate==true and there is no
 *        existing object with the same ID, nothing is done. If onlyUpdate==false a new object is created if no object
 *        with the same ID exists.
 * @return {Promise} promise that resolves if operation finished, rejects on a failure
 */
databaseService.saveObject = function (objectType, data, onlyUpdate) {
    return _initPromise
        .then(() => {
            if (!data || !objectType || !objectType.getModelName) {
                log.error('did not specify needed parameter "objectType"!');
                return Promise.reject();
            }
            if (data.isShortVersion) {
                log.warn('short versions of objects cannot be saved/updated! aborting.');
                return Promise.reject();
            }
            log.debug('saving ' + objectType.getModelName() + '...');
            return databaseService.getObject(objectType, data.id);
        })
        .then((existingObject) => {
            if (existingObject) {
                log.debug(objectType.getModelName() + ' already existing, doing update. id: ' + existingObject.id);
                let newObject = new objectType(data, existingObject);
                let saveData = JSON.parse(JSON.stringify(newObject));
                saveData._id = existingObject._id;
                saveData._rev = existingObject._rev;
                return applyFiltersAndSave(objectType.getIdPrefix(), saveData);
            } else if (!onlyUpdate) {
                let saveData = JSON.parse(JSON.stringify(data));
                saveData._id = saveData.id;
                return applyFiltersAndSave(objectType.getIdPrefix(), saveData);
            } else {
                log.warn('no existing ' + objectType.getModelName() + ' found to update, aborting.');
                return Promise.reject();
            }
        });
};

/**
 * saves a list of objects/documents in one action
 * @param objectList
 * @return {Promise<unknown[]>}
 */
databaseService.bulkSave = function (objectList) {
    if (!objectList || objectList.length === 0) {
        return Promise.resolve();
    }
    if (objectList[0].isShortVersion) {
        log.warn('not saving short version!');
        return Promise.resolve();
    }
    let elementCount = objectList.reduce((total, grid) => {
        let gridElementCount = grid.gridElements ? grid.gridElements.length : 0;
        return total + gridElementCount;
    }, 0);
    let maxCountSaveAtOnce = 1000; //found out by tests, above pouchdb errors occured
    let elemsPerGrid = Math.floor(elementCount / objectList.length);
    let encryptedList = convertServiceDb.convertLiveToDatabaseObjects(objectList);
    let chunks = [];
    encryptedList.forEach((object) => {
        object._id = object.id;
    });
    if (elementCount > maxCountSaveAtOnce) {
        let gridsPerChunk = Math.floor(maxCountSaveAtOnce / elemsPerGrid);
        chunks = util.splitInChunks(encryptedList, gridsPerChunk);
    } else {
        chunks = [objectList];
    }
    function saveChunksSequentially(chunks) {
        let chunk = JSON.parse(JSON.stringify(chunks.shift()));
        return pouchDbService.bulkDocs(chunk).then(() => {
            if (chunks.length > 0) {
                return saveChunksSequentially(chunks);
            } else {
                return Promise.resolve();
            }
        });
    }
    return saveChunksSequentially(chunks);
};

/**
 * deletes a list of objects/documents in one action
 * @param objectList
 * @return {Promise<never>}
 */
databaseService.bulkDelete = function (objectList) {
    if (!objectList || objectList.length === 0) {
        return Promise.resolve();
    }
    let deletedObjects = objectList.map(e => ({
        _id: e.id,
        _rev: e._rev,
        _deleted: true
    }));
    return pouchDbService.bulkDocs(deletedObjects);
};

/**
 * removes an object from database.
 *
 * @param id ID of the object to delete.
 * @return {Promise} promise that resolves if operation finished
 */
databaseService.removeObject = function (id) {
    return pouchDbService.remove(id);
};

/**
 * Inits/sets up for using of the database that belongs to the given username.
 * If the database of the given user is already opened and synchronization state is as intended, nothing is done.
 *
 * @param username the username of the logged in user
 * @param hashedUserPassword hashed password of the user
 * @param userDatabaseURL the database-URL of the logged in user
 * @param onlyRemote if true only the remote database is used, no local database is created (one-time login)
 *
 * @return {*}
 */
databaseService.initForUser = function (username, hashedUserPassword, userDatabaseURL, onlyRemote) {
    let shouldSync = (userDatabaseURL && !onlyRemote) || false;
    let userAlreadyOpened = pouchDbService.getOpenedDatabaseName() === username;
    let isLocalUser = localStorageService.getSavedLocalUsers().indexOf(username) !== -1;
    if (userAlreadyOpened && shouldSync === pouchDbService.isSyncEnabled()) {
        return Promise.resolve();
    }
    $(document).trigger(constants.EVENT_USER_CHANGING);
    return pouchDbService.initDatabase(username, userDatabaseURL, onlyRemote).then(() => {
        if (userAlreadyOpened) {
            return Promise.resolve();
        } else {
            return initInternal(hashedUserPassword, username, isLocalUser);
        }
    });
};

/**
 * Inits/sets up for using of the database that belongs to the given username that was just created.
 * If the database of the given user is already opened and synchronization state is as intended, nothing is done.
 *
 * @param username the username of the just registered user
 * @param hashedUserPassword hashed password of the user
 * @param userDatabaseURL the database-URL of the logged in user
 * @param onlyRemote if true only the remote database is used, no local database is created (one-time login)
 *
 * @return {*}
 */
databaseService.registerForUser = function (username, hashedUserPassword, userDatabaseURL, onlyRemote) {
    let shouldSync = userDatabaseURL && !onlyRemote;
    let isLocalUser = localStorageService.getSavedLocalUsers().indexOf(username) !== -1;
    if (pouchDbService.getOpenedDatabaseName() === username && shouldSync === pouchDbService.isSyncEnabled()) {
        return Promise.resolve();
    }
    return pouchDbService.createDatabase(username, userDatabaseURL, onlyRemote).then(() => {
        return initInternal(hashedUserPassword, username, isLocalUser);
    });
};

/**
 * deletes the local database belonging to the given username
 * @param user the name of the user whose database should be deleted
 * @return {*}
 */
databaseService.deleteDatabase = function (user) {
    if (!user) {
        return;
    }
    return pouchDbService.deleteDatabase(user);
};

/**
 * closes the currently opened database(s), afterwards new initialization of pouchDbService using initForUser() or
 * registerForUser() is necessary.
 * @return {*}
 */
databaseService.closeCurrentDatabase = function () {
    return pouchDbService.closeCurrentDatabase();
};

/**
 * returns the name of the currently opened database
 * @return {*}
 */
databaseService.getCurrentUsedDatabase = function () {
    return pouchDbService.getOpenedDatabaseName();
};

function initInternal(hashedUserPassword, username, isLocalUser) {
    _initPromise = Promise.resolve()
        .then(() => {
            //reset DB if specified by URL
            let promises = [];
            if (urlParamService.shouldResetDatabase()) {
                promises.push(pouchDbService.resetDatabase(username));
            }
            return Promise.all(promises);
        })
        .then(() => {
            return pouchDbService.allArray(MetaData.getIdPrefix());
        })
        .then((metadataObjects) => {
            //create metadata object if not exisiting, update datamodel version, if outdated
            let promises = [];
            if (metadataObjects.length === 0) {
                let metadata = new MetaData();
                metadataObjects = [metadata];
                encryptionService.setEncryptionProperties(hashedUserPassword, metadata.id, isLocalUser);
                promises.push(applyFiltersAndSave(MetaData.getIdPrefix(), metadata));
            }
            metadataObjects.sort((a, b) => a.id.localeCompare(b.id)); // always prefer older metadata objects
            let metadataIds = metadataObjects.map((o) => o.id);
            encryptionService.setEncryptionProperties(hashedUserPassword, metadataIds, isLocalUser);

            if (metadataObjects.length && metadataObjects.length > 1) {
                log.warn('found duplicated metadata!');
            }
            return Promise.all(promises);
        });
    _initPromise.then(() => {
        _lastDataModelVersion = null;
        $(document).trigger(constants.EVENT_USER_CHANGED);
    });
    return _initPromise;
}

function applyFiltersAndSave(idPrefix, data) {
    return new Promise((resolve, reject) => {
        let convertedData = convertServiceDb.convertLiveToDatabaseObjects(data);
        pouchDbService
            .save(idPrefix, convertedData)
            .then(() => {
                log.debug('saved ' + idPrefix + ', id: ' + data.id);
                resolve();
            })
            .catch(function (err) {
                reject(err);
            });
    });
}

function getModelVersion(dataOrArray) {
    if (!dataOrArray) {
        return null;
    }
    if (dataOrArray.modelVersion) {
        return dataOrArray.modelVersion;
    }
    if (dataOrArray[0] && dataOrArray[0].modelVersion) {
        return dataOrArray[0].modelVersion;
    }
    return null;
}

/**
 * Supprime complètement le compte utilisateur, y compris :
 * - Les données locales (PouchDB)
 * - Les données distantes (CouchDB)
 * - Les informations dans la base MySQL
 *
 * @param {string} username - Nom d'utilisateur à supprimer
 * @return {Promise} Promise qui se résout quand toutes les suppressions sont terminées
 */

databaseService.deleteUserAccount = function(username) {
    if (!username) {
        return Promise.reject(new Error('Username is required'));
    }

    log.info('Starting account deletion process for user: ' + username);
    
    _documentCache.clearAll();

    return new Promise((resolve, reject) => {
        // Get session information
        const session = superlogin.getSession();
        
        if (!session || !session.token) {
            log.error('No authentication session available for CouchDB operations');
            return reject(new Error('No authentication session available'));
        }
        
        // Construct CouchDB base URL and auth headers
        // Use the userDBs.syncUrl from the session or fallback to the public URL
        let couchDBBaseUrl = '';
        if (session.userDBs && session.userDBs.syncUrl) {
            // Extract base URL from the sync URL
            // Example: https://example.com/dbname -> https://example.com
            const syncUrl = session.userDBs.syncUrl;
            const urlParts = syncUrl.split('/');
            // Keep protocol and host (remove the database part)
            couchDBBaseUrl = urlParts.slice(0, 3).join('/');
        } else if (session.serverInfo && session.serverInfo.publicURL) {
            couchDBBaseUrl = session.serverInfo.publicURL;
        } else {
            // Fallback to hardcoded URL format
            couchDBBaseUrl = 'https://jmfc.dynseo.com:6984';
            log.warn('Using fallback CouchDB URL: ' + couchDBBaseUrl);
        }
        
        // Extract auth DB name from session or use default
        const authDBName = session.serverInfo?.couchAuthDB || 'auth-users';
        
        log.info(`Using CouchDB base URL: ${couchDBBaseUrl}`);
        const authHeader = `Bearer ${session.token}`;
        
        // Step 1: Find the user document in auth database
        log.info(`Finding user document in ${authDBName} for: ${username}`);
        
        // Query the view to find the user by username - equivalent to the nano.view call in the script
        $.ajax({
            url: `${couchDBBaseUrl}/${authDBName}/_design/views/_view/view-usernames`,
            type: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            data: { key: JSON.stringify(username) },
            success: function(viewResult) {
                if (!viewResult || !viewResult.rows || viewResult.rows.length === 0) {
                    log.warn(`User '${username}' not found in auth-users database.`);
                    // Continue with MySQL deletion anyway
                    deleteFromMySQL(username, resolve, reject);
                    return;
                }
                
                // Check the structure of the user document from view
                const userDoc = viewResult.rows[0];
                log.info(`Found user document: ${JSON.stringify(userDoc)}`);
                
                // Extract user ID and rev
                const userId = userDoc.id;
                let userRev;
                
                if (userDoc.value && userDoc.value.rev) {
                    userRev = userDoc.value.rev;
                } else if (userDoc.doc && userDoc.doc._rev) {
                    userRev = userDoc.doc._rev;
                } else {
                    // Need to fetch the full document to get the revision
                    $.ajax({
                        url: `${couchDBBaseUrl}/${authDBName}/${userId}`,
                        type: 'GET',
                        headers: {
                            'Authorization': authHeader,
                            'Content-Type': 'application/json'
                        },
                        async: false,
                        success: function(docResult) {
                            userRev = docResult._rev;
                            log.info(`Retrieved document revision: ${userRev}`);
                        },
                        error: function(xhr, status, error) {
                            log.warn(`Failed to get document revision: ${error}`);
                        }
                    });
                }
                
                if (!userRev) {
                    log.warn(`Could not determine document revision, may not be able to delete user document`);
                }
                deleteFromMySQL(username, resolve, reject);
                log.info(`User document ID: ${userId}, Rev: ${userRev}`);
            
                const userDbName = `jmfc-grid-data$${userId}`;
                
                // Delete the user's database
                log.info(`Deleting user database '${userDbName}'...`);
                
                $.ajax({
                    url: `${couchDBBaseUrl}/${userDbName}`,
                    type: 'DELETE',
                    headers: {
                        'Authorization': authHeader,
                        'Content-Type': 'application/json'
                    },
                    success: function() {
                        log.info(`Database '${userDbName}' successfully destroyed.`);
                        
                        // Delete the user document
                        log.info(`Deleting user document from ${authDBName}...`);
                        $.ajax({
                            url: `${couchDBBaseUrl}/${authDBName}/${userId}${userRev ? '?rev='+userRev : ''}`,
                            type: 'DELETE',
                            headers: {
                                'Authorization': authHeader,
                                'Content-Type': 'application/json'
                            },
                            success: function() {
                                log.info(`User document successfully deleted from ${authDBName}.`);
                                
                                // Additional step: Delete from _users database
                                log.info(`Attempting to delete user from _users database...`);
                                
                                $.ajax({
                                    url: `${couchDBBaseUrl}/_users/org.couchdb.user:${username}`,
                                    type: 'GET',
                                    headers: {
                                        'Authorization': authHeader,
                                        'Content-Type': 'application/json'
                                    },
                                    success: function(userDoc) {
                                        // Now delete the user document with its revision
                                        $.ajax({
                                            url: `${couchDBBaseUrl}/_users/org.couchdb.user:${username}?rev=${userDoc._rev}`,
                                            type: 'DELETE',
                                            headers: {
                                                'Authorization': authHeader,
                                                'Content-Type': 'application/json'
                                            },
                                            success: function() {
                                                log.info(`User successfully deleted from _users database.`);
                                                // After CouchDB cleanup, delete from MySQL
                                                deleteFromMySQL(username, resolve, reject);
                                            },
                                            error: function(xhr, status, error) {
                                                log.warn(`Failed to delete from _users database: ${error}`);
                                                // Continue with MySQL deletion anyway
                                                deleteFromMySQL(username, resolve, reject);
                                            }
                                        });
                                    },
                                    error: function(xhr, status, error) {
                                        log.warn(`Failed to find user in _users database: ${error}`);
                                        // Continue with MySQL deletion anyway
                                        deleteFromMySQL(username, resolve, reject);
                                    }
                                });
                            },
                            error: function(xhr, status, error) {
                                log.warn(`Failed to delete user document: ${error}`);
                                // Continue with MySQL deletion anyway
                                deleteFromMySQL(username, resolve, reject);
                            }
                        });
                    },
                    error: function(xhr, status, error) {
                        // If database couldn't be deleted (might not exist), still try to delete the user document
                        // log.warn(`Failed to delete database '${username}': ${error}`);
                        // Try to delete the user document anyway
                        log.info(`Attempting to delete user document from ${authDBName}...`);
                        $.ajax({
                            url: `${couchDBBaseUrl}/${authDBName}/${userId}${userRev ? '?rev='+userRev : ''}`,
                            type: 'DELETE',
                            headers: {
                                'Authorization': authHeader,
                                'Content-Type': 'application/json'
                            },
                            success: function() {
                                log.info(`User document successfully deleted from ${authDBName}.`);
                                // After CouchDB cleanup, delete from MySQL
                                deleteFromMySQL(username, resolve, reject);
                                // Additional step: Delete from _users database
                                log.info(`Attempting to delete user from _users database...`);
                                
                                $.ajax({
                                    url: `${couchDBBaseUrl}/_users/org.couchdb.user:${username}`,
                                    type: 'GET',
                                    headers: {
                                        'Authorization': authHeader,
                                        'Content-Type': 'application/json'
                                    },
                                    success: function(userDoc) {
                                        // Now delete the user document with its revision
                                        $.ajax({
                                            url: `${couchDBBaseUrl}/_users/org.couchdb.user:${username}?rev=${userDoc._rev}`,
                                            type: 'DELETE',
                                            headers: {
                                                'Authorization': authHeader,
                                                'Content-Type': 'application/json'
                                            },
                                            success: function() {
                                                log.info(`User successfully deleted from _users database.`);
                                                // After CouchDB cleanup, delete from MySQL
                                                deleteFromMySQL(username, resolve, reject);
                                            },
                                            error: function(xhr, status, error) {
                                                log.warn(`Failed to delete from _users database: ${error}`);
                                                // After CouchDB cleanup, delete from MySQL
                                                deleteFromMySQL(username, resolve, reject);
                                            }
                                        });
                                    },
                                    error: function(xhr, status, error) {
                                        log.warn(`User no longer exists in _users database: ${error}`);
                                        // After CouchDB cleanup, delete from MySQL
                                        deleteFromMySQL(username, resolve, reject);
                                    }
                                });
                            },
                            error: function(xhr, status, error) {
                                log.warn(`Failed to delete user document: ${error}`);
                                // After CouchDB cleanup, delete from MySQL
                                deleteFromMySQL(username, resolve, reject);
                            }
                        });
                    }
                });
            },
            error: function(xhr, status, error) {
                log.error(`Error querying auth-users view: ${error}`);
            }
        });
        
        // Helper function to delete user from MySQL
        function deleteFromMySQL(username, resolve, reject) {
            $.ajax({
                url: '/api/delete-user.php',
                type: 'DELETE',
                data: JSON.stringify({ username }),
                contentType: 'application/json',
                success: function(mysqlResponse) {
                    log.info(`MySQL cleanup for user '${username}' completed`);
                    log.info(`User '${username}' successfully deleted from all systems`);
                    resolve(true);
                },
                error: function(xhr, status, error) {
                    let errorMessage = '';
                    try {
                        const response = JSON.parse(xhr.responseText);
                        errorMessage = response.message || error;
                    } catch (e) {
                        errorMessage = error || 'Unknown error';
                    }
                    log.error(`Error deleting user from MySQL: ${errorMessage}`);
                    reject(new Error(`Failed to delete user from MySQL: ${errorMessage}`));
                }
            });
        }
    });
};

export { databaseService };

