import { deleteDB, openDB } from 'idb';
const databaseObjectKey = "token";
const databaseName = "Doordeck";

const dbPromise = openDB(databaseName, 1, {
    upgrade(db) {
        db.createObjectStore(databaseObjectKey);
    },
});

async function get(key) {
    return (await dbPromise).get(databaseObjectKey, key);
}

async function set(key, val) {
    (await dbPromise).delete(databaseObjectKey, key);
    return (await dbPromise).put(databaseObjectKey, val, key);
}

async function keys() {
    return (await dbPromise).getAllKeys(databaseObjectKey);
}
async function getAll() {
    return (await dbPromise).getAll(databaseObjectKey);

}
export async function del(key) {
    return (await dbPromise).delete(databaseObjectKey, key);
}

export async function deleteDatabase() {
    return await deleteDB(databaseName);
}

export default { get, set, keys, getAll, del, deleteDatabase }