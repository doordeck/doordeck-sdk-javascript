import {AUTH_TOKEN, CERT} from '../constants'

import IDB from '../idb'
import axios from 'axios'
import doordeck from '../doordeck'
import {Certificate} from "pkijs";
import {fromBER} from "asn1js";

/**
 * @param certObject - our stored certificate
 * @private
 * We usually emit 1 month valid certificates. We'll check
 * if this cert is expiring in less than a week. If so, we'll
 * delete it, and we'll return @null to force a new certificate
 */
export const _certAccordingToValidity = async function (certObject) {
    try {
        let base64DerCertificate = certObject["certificateChain"][0];
        const base64DerCertificateArrayBuffer = Uint8Array.from(atob(base64DerCertificate), c => c.charCodeAt(0)).buffer;
        const asn1 = fromBER(base64DerCertificateArrayBuffer);
        const cert = new Certificate({schema: asn1.result});
        const endDate = cert.notAfter.value;
        const now = new Date();

        // Calculate the date one week before the certificate's end date
        let expiryThreshold = new Date(endDate);
        expiryThreshold.setDate(expiryThreshold.getDate() - 7);

        if (now >= expiryThreshold) {
            // The certificate expires in less than a week
            // Delete cert, return null to force getting a new one.
            await deleteCert();
            return null;
        } else {
            // The certificate is valid for more than a week
            return certObject;
        }
    } catch (error) {
        // We don't care, there wasn't probably a proper cert here
        return null;
    }
}

const retrieveSavedCert = async function () {
    const email = localStorage.email;
    if (!email) return null
    const cert = await IDB.get(email)
    if (cert) {
        localStorage[CERT] = JSON.stringify(cert)
        return await _certAccordingToValidity(cert)
    }
    return null
}

const isCertSaved = function () {
    return localStorage[CERT] !== null && localStorage[CERT] !== undefined
}

const storeCert = function (cert) {
    localStorage[CERT] = JSON.stringify(cert)
    // update cert in indexedDB
    const email = localStorage.email;
    IDB.set(email, cert)
}

const deleteCert = async function () {
    localStorage.removeItem(CERT);
    await IDB.deleteDatabase();
}

const registerCertificate = function (pubKey) {
    const ephKey = doordeck.libSodium.to_base64(pubKey, doordeck.libSodium.base64_variants.ORIGINAL);
    return axios.post(doordeck.getBaseUrl() + '/auth/certificate', {
        'ephemeralKey': ephKey
    }, {
        headers: {
            'Authorization': 'Bearer ' + localStorage[AUTH_TOKEN]
        }
    })
}
const registerCertificate2FA = function (pubKey) {
    const ephKey = doordeck.libSodium.to_base64(pubKey, doordeck.libSodium.base64_variants.ORIGINAL);
    return axios.post(doordeck.getBaseUrl() + '/auth/certificate/verify', {
        'ephemeralKey': ephKey
    }, {
        headers: {
            'Authorization': 'Bearer ' + localStorage[AUTH_TOKEN]
        }
    })
}
const verify2FA = function (code, priKey) {
    const signature = doordeck.libSodium.crypto_sign_detached(code, priKey);
    return axios.post(doordeck.getBaseUrl() + '/auth/certificate/check', {
        'verificationSignature': doordeck.libSodium.to_base64(signature, doordeck.libSodium.base64_variants.ORIGINAL)
    }, {
        headers: {
            'Authorization': 'Bearer ' + localStorage[AUTH_TOKEN]
        }
    })
}

export default {
    getCertificate(ephemeralKey) {
        return new Promise(async function (resolve, reject) {
            const cert = await retrieveSavedCert()

            if (cert) {
                resolve({state: 'success', message: 'Doordeck SDK is loaded'})
            } else {
                registerCertificate(ephemeralKey.publicKey)
                    .then(response => {
                        storeCert(response.data)
                        resolve({state: 'success', message: 'Doordeck SDK is loaded'})
                    })
                    .catch(fail => {
                        if (fail.response.status === 423 && localStorage.token) {
                            registerCertificate2FA(ephemeralKey.publicKey)
                                .then(response => {
                                    if (response.data.method !== undefined && response.data.method !== null) {
                                        reject({state: 'verify', method: response.data.method})
                                    } else {
                                        reject({state: 'verify', message: 'Failed to send 2FA request'})
                                    }
                                })
                                .catch(fail => {
                                    reject({state: 'verify', message: 'Failed to send 2FA request'})
                                })
                        } else {
                            reject({state: 'verify', message: 'Failed to get certificate'})
                        }
                    })
            }
        })
    },
    verifyCode(code, ephemeralKey) {
        return new Promise(function (resolve, reject) {
            verify2FA(code, ephemeralKey.privateKey).then(response => {
                storeCert(response.data)
                resolve({state: 'success', message: 'Doordeck SDK is loaded'})
            }, fail => {
                reject({state: 'fail', message: 'Something went wrong'})
            })
        })
    },
    retrieveSavedCert,
    registerCertificate,
    registerCertificate2FA,
    storeCert,
    deleteCert,
    isCertSaved
}
