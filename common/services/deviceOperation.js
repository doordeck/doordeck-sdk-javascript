// noinspection JSUnusedGlobalSymbols,JSCheckFunctionSignatures

import axios from "axios";
import {CERT} from "../constants";
import ephemaralKeyGenerator from "./ephemeralKeyGenerator";
import doordeck from "../doordeck";
import certificate from "./certificate.js";

const _signer = function (deviceId, operation) {
    // Retrieve the EdDSA private key from storage
    const privateKey = ephemaralKeyGenerator.retrieveSavedKeys().privateKey

    // Header
    // noinspection JSUnresolvedVariable
    const oHeader = {
        alg: "EdDSA",
        typ: "JWT",
        x5c: JSON.parse(localStorage[CERT]).certificateChain,
    };

    // Payload
    const tNow = Math.floor(Date.now() / 1000)
    const tEnd = tNow + 60
    const oPayload = {
        iss: JSON.parse(localStorage[CERT]).userId,
        sub: deviceId,
        nbf: tNow,
        iat: tNow,
        exp: tEnd,
        jti: self.crypto.randomUUID(),
        operation: operation
    }
    // noinspection JSUnresolvedVariable,JSUnresolvedFunction
    const sHeader = doordeck.libSodium.to_base64(
        JSON.stringify(oHeader),
        doordeck.libSodium.base64_variants.URLSAFE_NO_PADDING,
    )
    // noinspection JSUnresolvedVariable,JSUnresolvedFunction
    const sPayload = doordeck.libSodium.to_base64(
        JSON.stringify(oPayload),
        doordeck.libSodium.base64_variants.URLSAFE_NO_PADDING,
    )
    const message = sHeader + '.' + sPayload
    // noinspection JSUnresolvedVariable,JSUnresolvedFunction
    const signature = doordeck.libSodium.crypto_sign_detached(message, privateKey)
    // noinspection JSUnresolvedVariable,JSUnresolvedFunction
    return message + '.' + doordeck.libSodium.to_base64(
        signature,
        doordeck.libSodium.base64_variants.URLSAFE_NO_PADDING,
    )
};
/**
 * Validates or registers a certificate using an ephemeral key.
 * Checks if a saved, valid certificate and key exist; if not, generates
 * a new key (if necessary) and registers a new certificate. Handles 2FA if required.
 *
 * @returns {Promise<boolean>} Resolves true if certificate is valid or newly registered
 * @throws {Object} Verification error if 2FA is required
 */
const validateAndRegisterCertificate = async () => {
    const validCert = await certificate.retrieveSavedCert();
    if (validCert) return true;

    let ephemeralKey = ephemaralKeyGenerator.retrieveSavedKeys();
    if (!ephemeralKey) {
        ephemeralKey = await ephemaralKeyGenerator.generateKeys();
    }

    return new Promise((resolve, reject) => {
        certificate.getCertificate(ephemeralKey)
            .then(response => {
                if (response.state === 'success') {
                    resolve(true);
                }
            })
            .catch(error => {
                if (error.state === 'verify') {
                    reject(error);
                } else {
                    reject({ state: 'error', message: 'Failed to validate or register certificate' });
                }
            });
    });
};
/**
 * Executes an operation on a device after validating or registering the certificate.
 *
 * @param {string} deviceId - The ID of the device
 * @param {string} operation - The operation to execute
 * @returns {Promise} Axios response from the device execution request
 * @throws {Object} Verification error if 2FA is required
 */
const _executor = async function (deviceId, operation) {
    try {
        // Validate or register the certificate before proceeding
        await validateAndRegisterCertificate();

        const signature = _signer(deviceId, operation);
        return axios.post(
            `${doordeck.getBaseUrl()}/device/${deviceId}/execute`,
            signature,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.token}`,
                    "Content-Type": "application/jwt",
                },
                transformRequest: [
                    (data) => data
                ],
                timeout: 10000,
            }
        );
    } catch (error) {
        // Handle errors from certificate validation or registration
        return Promise.reject(error);
    }
};
const _getUserByEmail = function (userEmail, visitor) {
    let url = doordeck.getBaseUrl() + "/share/invite/" + userEmail;
    if (visitor !== undefined) {
        url += "?visitor=" + visitor;
    }
    return axios.post(url, null, {
        skipAuthorization: true,
        headers: {
            'Authorization': "Bearer " + localStorage.token,
            'Content-Type': 'application/json'
        },
    })
        .then((response) => {
            return response;
        });
};
const _getUserById = function (id) {
    return axios
        .post(
            doordeck.getBaseUrl() + "/directory/query",
            {localKey: id},
            {
                skipAuthorization: true,
                headers: {
                    Authorization: "Bearer " + localStorage.token,
                },
            }
        )
        .then((response) => {
            return response;
        });
};
export default {
    lock(deviceId) {
        return _executor(deviceId, {
            type: "MUTATE_LOCK",
            locked: true,
        });
    },
    unlock(deviceId) {
        return _executor(deviceId, {
            type: "MUTATE_LOCK",
            locked: false,
        });
    },
    changeOpenHours(deviceId, settings) {
        return _executor(deviceId, {
            type: "MUTATE_SETTING",
            unlockBetween: settings,
        });
    },
    changeUnlockTime(deviceId, time) {
        return _executor(deviceId, {
            type: "MUTATE_SETTING",
            unlockDuration: parseInt(time),
        });
    },
    remove(deviceId, users) {
        return _executor(deviceId, {
            type: "REMOVE_USER",
            users: users,
        });
    },
    /* eslint-disable */
    getUser(user) {
        const emailRegex =
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (emailRegex.test(user)) {
            return _getUserByEmail(user).then((response) => {
                response.data = {user: response.data, email: user};
                return response;
            });
        } else {
            const uuidRegex =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
            if (uuidRegex.test(user)) {
                return _getUserById(user).then((response) => {
                    response.data = {user: response.data, email: user};
                    return response;
                });
            }
        }
    },
    getDoordeckUser(user, visitor) {
        const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if (emailRegex.test(user)) {
            return _getUserByEmail(user, visitor).then(response => {
                const data = {'user': response.data, 'email': user};
                response.data = data
                return response
            })
        } else {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
            if (uuidRegex.test(user)) {
                return _getUserById(user).then(response => {
                    const data = {'user': response.data, 'email': user};
                    response.data = data
                    return response
                })
            }
        }
    },
    share(deviceId, user, role, start, end) {
        if (start == null && end == null) {
            return _executor(deviceId, {
                type: "ADD_USER",
                publicKey: user.publicKey,
                user: user.userId,
                role: role,
            }).then((response) => {
                const share = {};
                share.id = deviceId;
                share.email = user.email;
                response.data = share;
                return response;
            });
        } else {
            return _executor(deviceId, {
                type: "ADD_USER",
                publicKey: user.publicKey,
                user: user.userId,
                role: role,
                start: start,
                end: end,
            }).then((response) => {
                const share = {};
                share.id = deviceId;
                share.email = user.email;
                response.data = share;
                return response;
            });
        }
    },
    changeRole(deviceId, user, role) {
        return _executor(deviceId, {
            type: "ADD_USER",
            publicKey: user.publicKey,
            user: user.userId,
            role: role,
        }).then((response) => {
            const share = {};
            share.id = deviceId;
            share.email = user.email;
            response.data = share;
            return response;
        });
    },
    getLockFromTile(tileId) {
        return axios.get(doordeck.getBaseUrl() + "/tile/" + tileId, {
            skipAuthorization: true,
            headers: {
                Authorization: "Bearer " + localStorage.token,
                Accept: "application/vnd.doordeck.api-v3+json"
            },
        });
    },
    getLockInfo(lockId) {
        return axios.get(doordeck.getBaseUrl() + "/device/" + lockId, {
            headers: {
                Authorization: "Bearer " + localStorage.token,
            },
        });
    },
    link(deviceId, tileId) {
        return axios.put(
            doordeck.getBaseUrl() + "/device/" + deviceId + "/tile/" + tileId,
            null,
            {
                skipAuthorization: true,
                headers: {
                    Authorization: "Bearer " + localStorage.token,
                    'Content-Type': 'application/json',
                },
            }
        );
    },
    delink(deviceId, tileId) {
        return axios.delete(doordeck.getBaseUrl() + "/device/" + deviceId + "/tile/" + tileId, {
            skipAuthorization: true,
            headers: {
                Authorization: "Bearer " + localStorage.token,
            },
        });
    },
};
