import axios from 'axios'
import { AUTH_TOKEN, BASE_URL, CERT } from '../constants'
import doordeck from '../doordeck'

const retrieveSavedCert = function () {
  if (localStorage[CERT] !== null && localStorage[CERT] !== undefined) return JSON.parse(localStorage[CERT])
  else return null
}
const storeCert = function (cert) {
  localStorage[CERT] = JSON.stringify(cert)
}
const resetCert = function () {
  localStorage[CERT] = null;
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
    return new Promise (function(resolve, reject) {
      if (retrieveSavedCert() == null && retrieveSavedCert() == undefined) {
        registerCertificate(ephemeralKey.publicKey).then(response => {
          storeCert(response.data)
          resolve({state: 'success', message: 'Doordeck SDK is loaded'})
        }, fail => {
          if (fail.response.status === 423) {
            registerCertificate2FA(ephemeralKey.publicKey).then(response => {
              if (response.data.method !== undefined && response.data.method !== null) {
                reject({state: 'verify', method: response.data.method})
              } else reject({state: 'error', message: 'Failed to send 2FA request'})
            }, fail => {
              if (fail.response.status === 429) {
                reject({state: 'error', message: 'Too many current pending verifications', code: 429});
              } else {
                reject({state: 'error', message: 'Failed to send 2FA request'});
              }
            })
          } else {
            reject({state: 'error', message: 'Failed to get certificate'})
          }
          console.log(fail)
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
  retrieveSavedCert,
  resetCert
}
