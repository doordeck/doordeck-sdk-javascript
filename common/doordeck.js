import { AUTH_TOKEN } from './constants'
import ephemaralKeyGenerator from './services/ephemeralKeyGenerator'
import certificate from './services/certificate'
import libSodium from 'libsodium-wrappers'
import device from "./services/deviceOperation";

const isLoaded = async function (authToken) {
  if (authToken === getStoredAuthToken()) {
    if (ephemaralKeyGenerator.retrieveSavedKeys() !== null) {
      return (await certificate.retrieveSavedCert()) !== null;
    } else return false
  } else return false
}

const doordeckInit = function (authToken) {
  return new Promise (function(resolve, reject) {
    libSodium.ready.then(async function () {
      if ((await isLoaded())) resolve({state: 'success', message: 'Doordeck is already initialised.'})
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
