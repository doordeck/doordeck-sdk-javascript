import { BASE_URL, CERT } from '../constants'

import axios from 'axios'
import doordeck from '../doordeck'
import ephemaralKeyGenerator from './ephemeralKeyGenerator'

var baseUrl = BASE_URL

var signer = function (deviceId, operation) {
  var privateKey = ephemaralKeyGenerator.retrieveSavedKeys().privateKey

  // Header
  var oHeader = { alg: 'EdDSA', typ: 'JWT', x5c: JSON.parse(localStorage[CERT]).certificateChain }
  // Payload
  var tNow = Math.floor(Date.now() / 1000)
  var tEnd = tNow + 60
  var oPayload = {
    iss: JSON.parse(localStorage[CERT]).userId,
    sub: deviceId,
    nbf: tNow,
    iat: tNow,
    exp: tEnd,
    operation: operation
  }
  var sHeader = doordeck.libSodium.to_base64(JSON.stringify(oHeader), doordeck.libSodium.base64_variants.ORIGINAL)
  var sPayload = doordeck.libSodium.to_base64(JSON.stringify(oPayload), doordeck.libSodium.base64_variants.ORIGINAL)
  var message = sHeader + '.' + sPayload
  var signature = doordeck.libSodium.crypto_sign_detached(message, privateKey)
  return message + '.' + doordeck.libSodium.to_base64(signature, doordeck.libSodium.base64_variants.ORIGINAL)
}

var executor = function (deviceId, operation) {
  var signature = signer(deviceId, operation)
  return axios({
    url: baseUrl + '/device/' + deviceId + '/execute',
    method: "POST",
    data: signature,
    skipAuthorization: true,
    transformRequest: [
      function (data, headers) { return data },
    ],
    headers: {
      'Authorization': 'Bearer ' + localStorage.token,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  })
}
var getDoordeckUserByEmail = function (userEmail, visitor) {
  return axios.post(baseUrl + '/share/invite/' + userEmail + '?visitor=' + visitor, null, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.token,
      'Content-Type': 'application/json'
    }
  }).then(response => {
    return response
  })
}
var getUserByEmail = function (email) {
  return axios.post(baseUrl + '/directory/query', { 'email': email }, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.token,
      'Content-Type': 'application/json'
    }
  }).then(response => {
    return response
  })
}
var getUserById = function (id) {
  return axios.post(baseUrl + '/directory/query', { 'localKey': id }, {
    headers: {
      'Authorization': 'Bearer ' + localStorage.token,
      'Content-Type': 'application/json'
    }
  }).then(response => {
    return response
  })
}
export default {
  lock(deviceId) {
    return executor(deviceId, {
      type: 'MUTATE_LOCK',
      locked: true
    })
  },
  unlock(deviceId, duration) {
    return executor(deviceId, {
      type: 'MUTATE_LOCK',
      locked: false,
      duration: duration
    })
  },
  changeOpenHours(deviceId, settings) {
    return executor(deviceId, {
      type: 'MUTATE_SETTING',
      unlockBetween: settings
    })
  },
  changeUnlockTime(deviceId, time) {
    return executor(deviceId, {
      type: 'MUTATE_SETTING',
      unlockDuration: parseInt(time)
    })
  },
  remove(deviceId, users) {
    return executor(deviceId, {
      type: 'REMOVE_USER',
      users: users
    })
  },
  getUser(user) {
    var emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    if (emailRegex.test(user)) {
      return getUserByEmail(user).then(response => {
        var data = { 'user': response.data, 'email': user }
        response.data = data
        return response
      })
    } else {
      var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      if (uuidRegex.test(user)) {
        return getUserById(user).then(response => {
          var data = { 'user': response.data, 'email': user }
          response.data = data
          return response
        })
      }
    }
  },
  getDoordeckUser(user, visitor) {
    var emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    if (emailRegex.test(user)) {
      return getDoordeckUserByEmail(user, visitor).then(response => {
        var data = { 'user': response.data, 'email': user }
        response.data = data
        return response
      })
    } else {
      var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      if (uuidRegex.test(user)) {
        return getUserById(user).then(response => {
          var data = { 'user': response.data, 'email': user }
          response.data = data
          return response
        })
      }
    }
  },
  share(deviceId, user, role, start, end) {
    if (start == null && end == null) {
      return executor(deviceId, {
        type: 'ADD_USER',
        publicKey: user.publicKey,
        user: user.userId,
        role: role
      }).then(response => {
        var share = {}
        share.id = deviceId
        share.email = user.email
        response.data = share
        return response
      })
        .catch(fail => {
          var share = {}
          share.id = deviceId
          share.email = user.email
          return fail
        })
    } else {
      return executor(deviceId, {
        type: 'ADD_USER',
        publicKey: user.publicKey,
        user: user.userId,
        role: role,
        start: start,
        end: end
      }).then(response => {
        var share = {}
        share.id = deviceId
        share.email = user.email
        response.data = share
        return response
      }, fail => {
        var share = {}
        share.id = deviceId
        share.email = user.email
        return fail
      })
    }
  },
  changeRole(deviceId, user, role) {
    return executor(deviceId, {
      type: 'ADD_USER',
      publicKey: user.publicKey,
      user: user.userId,
      role: role
    }).then(response => {
      var share = {}
      share.id = deviceId
      share.email = user.email
      response.data = share
      return response
    })
  },
  getLockFromTile(tileId) {
    return axios.get(baseUrl + '/tile/' + tileId, {
      headers: {
        'Accept': 'application/vnd.doordeck.api-v3+json',
        'Authorization': 'Bearer ' + localStorage.token,
        'Content-Type': 'application/json'
      }
    })
  },
  link(deviceId, tileId) {
    return axios.put(baseUrl + '/device/' + deviceId + '/tile/' + tileId, null, {
      headers: {
        'Authorization': 'Bearer ' + localStorage.token,
        'Content-Type': 'application/json'
      }
    })
  },
  delink(deviceId, tileId) {
    return axios.delete(baseUrl + '/device/' + deviceId + '/tile/' + tileId, {
      headers: {
        'Authorization': 'Bearer ' + localStorage.token,
        'Content-Type': 'application/json'
      }
    })
  }
}
