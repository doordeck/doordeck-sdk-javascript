import { AUTH_TOKEN, BASE_URL, CERT } from '../constants'

import IDB from '../idb'
import axios from 'axios'
import doordeck from '../doordeck'

const retrieveSavedCert = async function () {
  const email = localStorage.email;
  if(!email) return null
  const cert = await IDB.get(email)
  if(cert) {
    localStorage[CERT] = JSON.stringify(cert)
    return cert
  }
  return null
}
const storeCert = function (cert) {
  localStorage[CERT] = JSON.stringify(cert)
  // update cert in indexedDB
  const email = localStorage.email;
  IDB.set(email, cert)
}

const deleteCert = async function() {
  await IDB.deleteDatabase();
}

const registerCertificate = function (pubKey) {
  var ephKey = doordeck.libSodium.to_base64(pubKey, doordeck.libSodium.base64_variants.ORIGINAL)
  return axios.post(BASE_URL + '/auth/certificate', {
    'ephemeralKey': ephKey
  }, {
    headers: {
      'Authorization': 'Bearer ' + localStorage[AUTH_TOKEN]
    }
  })
}
const registerCertificate2FA = function(pubKey) {
  var ephKey = doordeck.libSodium.to_base64(pubKey, doordeck.libSodium.base64_variants.ORIGINAL)
  return axios.post(BASE_URL + '/auth/certificate/verify', {
    'ephemeralKey': ephKey
  }, {
    headers: {
      'Authorization': 'Bearer ' + localStorage[AUTH_TOKEN]
    }
  })
}
const verify2FA = function(code, priKey) {
  var signature = doordeck.libSodium.crypto_sign_detached(code, priKey)
  return axios.post(BASE_URL + '/auth/certificate/check', {
    'verificationSignature': doordeck.libSodium.to_base64(signature, doordeck.libSodium.base64_variants.ORIGINAL)
  }, {
    headers: {
      'Authorization': 'Bearer ' + localStorage[AUTH_TOKEN]
    }
  })
}

export default {
  getCertificate (ephemeralKey) {
    return new Promise (async function(resolve, reject) {
      const cert = await retrieveSavedCert()
      if (cert == null && cert == undefined) {
        registerCertificate(ephemeralKey.publicKey)
        .then(response => {
          storeCert(response.data)
          resolve({state: 'success', message: 'Doordeck SDK is loaded'})
        })
        .catch(fail => {
          if (fail.response.status === 423) {
            if (localStorage.token !== null && localStorage.token !== undefined) {
              registerCertificate2FA(ephemeralKey.publicKey).then(response => {
                if (response.data.method !== undefined && response.data.method !== null) {
                  reject({state: 'verify', method: response.data.method})
                } else reject({state: 'error', message: 'Failed to send 2FA request'})
              })
            }
          } else {
            reject({state: 'error', message: 'Failed to get certificate'})
          }
        })
      } else {
        resolve({state: 'success', message: 'Doordeck SDK is loaded'})
      }
    })
  },
  verifyCode (code, ephemeralKey) {
    return new Promise (function(resolve, reject) {
      verify2FA(code, ephemeralKey.privateKey).then(response => {
        storeCert(response.data)
        resolve({state: 'success', message: 'Doordeck SDK is loaded'})
      }, fail => {
        reject({state: 'fail', message: 'Something went wrong'})
      })
    })
  },
  retrieveSavedCert
}
