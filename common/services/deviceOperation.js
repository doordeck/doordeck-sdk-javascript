// noinspection JSUnusedGlobalSymbols,JSCheckFunctionSignatures

import axios from "axios";
import { CERT } from "../constants";
import ephemaralKeyGenerator from "./ephemeralKeyGenerator";
import doordeckSDK from "../doordeck";

const signer = function (deviceId, operation) {
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
    operation: operation
  }
  // noinspection JSUnresolvedVariable,JSUnresolvedFunction
  const sHeader = doordeckSDK.libSodium.to_base64(JSON.stringify(oHeader), doordeckSDK.libSodium.base64_variants.ORIGINAL)
  // noinspection JSUnresolvedVariable,JSUnresolvedFunction
  const sPayload = doordeckSDK.libSodium.to_base64(JSON.stringify(oPayload), doordeckSDK.libSodium.base64_variants.ORIGINAL)
  const message = sHeader + '.' + sPayload
  // noinspection JSUnresolvedVariable,JSUnresolvedFunction
  const signature = doordeckSDK.libSodium.crypto_sign_detached(message, privateKey)
  // noinspection JSUnresolvedVariable,JSUnresolvedFunction
  return message + '.' + doordeckSDK.libSodium.to_base64(signature, doordeckSDK.libSodium.base64_variants.ORIGINAL)
};

const executor = function (baseUrl, deviceId, operation) {
  const signature = signer(deviceId, operation);
  return axios({
    url: baseUrl + "/device/" + deviceId + "/execute",
    method: "POST",
    data: signature,
    skipAuthorization: true,
    transformRequest: [
      function (data) {
        return data;
      },
    ],
    headers: {
      Authorization: "Bearer " + localStorage.token,
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });
};
const getUserByEmail = function (baseUrl, userEmail) {
  return axios
      .post(baseUrl + "/share/invite/" + userEmail, null, {
        skipAuthorization: true,
        headers: {
          Authorization: "Bearer " + localStorage.token,
        },
      })
      .then((response) => {
        return response;
      });
};
const getUserById = function (baseUrl, id) {
  return axios
      .post(
          baseUrl + "/directory/query",
          { localKey: id },
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
  lock(baseUrl, deviceId) {
    return executor(baseUrl, deviceId, {
      type: "MUTATE_LOCK",
      locked: true,
    });
  },
  unlock(baseUrl, deviceId, duration) {
    return executor(baseUrl, deviceId, {
      type: "MUTATE_LOCK",
      locked: false,
      duration: duration,
    });
  },
  changeOpenHours(baseUrl, deviceId, settings) {
    return executor(baseUrl, deviceId, {
      type: "MUTATE_SETTING",
      unlockBetween: settings,
    });
  },
  changeUnlockTime(baseUrl, deviceId, time) {
    return executor(baseUrl, deviceId, {
      type: "MUTATE_SETTING",
      unlockDuration: parseInt(time),
    });
  },
  remove(baseUrl, deviceId, users) {
    return executor(baseUrl, deviceId, {
      type: "REMOVE_USER",
      users: users,
    });
  },
  /* eslint-disable */
  getUser(baseUrl, user) {
    const emailRegex =
        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (emailRegex.test(user)) {
      return getUserByEmail(user).then((response) => {
        response.data = { user: response.data, email: user };
        return response;
      });
    } else {
      const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      if (uuidRegex.test(user)) {
        return getUserById(baseUrl, user).then((response) => {
          response.data = { user: response.data, email: user };
          return response;
        });
      }
    }
  },
  share(baseUrl, deviceId, user, role, start, end) {
    if (start == null && end == null) {
      return executor(baseUrl, deviceId, {
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
      return executor(baseUrl, deviceId, {
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
  changeRole(baseUrl, deviceId, user, role) {
    return executor(baseUrl, deviceId, {
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
  getLockFromTile(baseUrl, tileId) {
    return axios.get(baseUrl + "/tile/" + tileId, {
      skipAuthorization: true,
      headers: {
        Authorization: "Bearer " + localStorage.token,
      },
    });
  },
  getLockInfo(baseUrl, lockId) {
    return axios.get(baseUrl + "/device/" + lockId, {
      headers: {
        Authorization: "Bearer " + localStorage.token,
      },
    });
  },
  link(baseUrl, deviceId, tileId) {
    return axios.put(
        baseUrl + "/device/" + deviceId + "/tile/" + tileId,
        null,
        {
          skipAuthorization: true,
          headers: {
            Authorization: "Bearer " + localStorage.token,
          },
        }
    );
  },
  delink(baseUrl, deviceId, tileId) {
    return axios.delete(baseUrl + "/device/" + deviceId + "/tile/" + tileId, {
      skipAuthorization: true,
      headers: {
        Authorization: "Bearer " + localStorage.token,
      },
    });
  },
};
