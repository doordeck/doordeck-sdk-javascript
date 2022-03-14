import { AUTH_TOKEN } from './constants'
import ephemaralKeyGenerator from './services/ephemeralKeyGenerator'
import certificate from './services/certificate'
import libSodium from 'libsodium-wrappers'
import device from './services/deviceOperation'

const isLoaded = function (authToken) {
  if (authToken === getStoredAuthToken()) {
    if (ephemaralKeyGenerator.retrieveSavedKeys() !== null) {
      if (certificate.retrieveSavedCert() !== null) {
        return true
      } else return false
    } else return false
  } else return false
}

const doordeckInit = function (authToken) {
  return new Promise (function(resolve, reject) {
    libSodium.ready.then(function () {
      if (isLoaded(authToken)) resolve({state: 'success', message: 'Doordeck is already initialised.'})
      if (authToken !== null && authToken !== undefined) {
        storeAuthToken(authToken)
        ephemaralKeyGenerator.generateKeys().then(keys => {
          certificate.getCertificate(keys).then(response => {
            resolve(response)
          }, fail => {
            reject(fail)
          })
        })
      } else reject({state: 'error', message: 'No Auth Token provided.'})
    })
  })
}

const unlock = function (deviceId) {
  return new Promise (function (resolve, reject) {
    libSodium.ready.then(function () {
      deviceOperation.unlock(deviceId, 7).then(response => {
        resolve({state: 'succces', message: 'Door is unlocked.'})
      }, fail => {
        reject({state: 'error', message: 'No Auth Token provided.'})
      })
    })
  })
}

const share = function (deviceId, user, role, start, end) {
  return new Promise (function (resolve, reject) {
    libSodium.ready.then(function () {
      deviceOperation.share(deviceId, user, role, start, end).then(response => {
        resolve({state: 'succces', message: 'Door is unlocked.'})
      }, fail => {
        reject({state: 'error', message: 'No Auth Token provided.'})
      })
    })
  })
}

const storeAuthToken = function (authToken) {
  localStorage[AUTH_TOKEN] = authToken
}

const getStoredAuthToken = function () {
  return localStorage[AUTH_TOKEN]
}


const verifyCode = function (code) {
  return certificate.verifyCode(code, ephemaralKeyGenerator.retrieveSavedKeys())
}

export default {
  doordeckInit,
  verifyCode,
  device,
  libSodium
}
