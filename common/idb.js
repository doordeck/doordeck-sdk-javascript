import {deleteDB, openDB} from 'idb';

const databaseObjectKey = "token";
const databaseName = "Doordeck";

var _dbPromise = null;

function _recreateDatabase() {
    return openDB(databaseName, 1, {
        upgrade(db) {
            db.createObjectStore(databaseObjectKey);
        },
    });
}

async function dbPromise() {
    if (_dbPromise == null) {
        _dbPromise = _recreateDatabase();
    }

    return await _dbPromise
}

async function get(key) {
    return (await dbPromise()).get(databaseObjectKey, key);
}

async function set(key, val) {
    (await dbPromise()).delete(databaseObjectKey, key);
    return (await dbPromise()).put(databaseObjectKey, val, key);
}

async function keys() {
    return (await dbPromise()).getAllKeys(databaseObjectKey);
}

async function getAll() {
    return (await dbPromise()).getAll(databaseObjectKey);

}

export async function del(key) {
    return (await dbPromise()).delete(databaseObjectKey, key);
}

export async function deleteDatabase() {
    // Get the DB
    const db = await dbPromise();
    // Close all the connections first
    db.close();
    // Then delete the DB.
    await deleteDB(databaseName);
    _dbPromise = null;
}

export default { get, set, keys, getAll, del, deleteDatabase }
