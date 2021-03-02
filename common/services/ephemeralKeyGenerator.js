import doordeck from '../doordeck'
import { EPHEMERAL_PUBKEY, EPHEMERAL_PRIKEY } from '../constants'

const storeKeys = function (keys) {
  localStorage[EPHEMERAL_PRIKEY] = doordeck.libSodium.to_base64(keys.privateKey, doordeck.libSodium.base64_variants.ORIGINAL)
  localStorage[EPHEMERAL_PUBKEY] = doordeck.libSodium.to_base64(keys.publicKey, doordeck.libSodium.base64_variants.ORIGINAL)
}
const retrieveSavedKeys = function () {
  if (localStorage[EPHEMERAL_PUBKEY] !== null && localStorage[EPHEMERAL_PUBKEY] !== undefined && localStorage[EPHEMERAL_PRIKEY] !== null && localStorage[EPHEMERAL_PRIKEY] !== undefined) {
    return {
      privateKey: doordeck.libSodium.from_base64(localStorage[EPHEMERAL_PRIKEY], doordeck.libSodium.base64_variants.ORIGINAL),
      publicKey: doordeck.libSodium.from_base64(localStorage[EPHEMERAL_PUBKEY], doordeck.libSodium.base64_variants.ORIGINAL)
    }
  }
  else return null
}

export default {
  generateKeys () { return new Promise(function(resolve, reject) {
      if (retrieveSavedKeys() !== null) {
        let keys = retrieveSavedKeys()
        resolve(keys)
      } else{
        let keys = doordeck.libSodium.crypto_sign_keypair()
        storeKeys(keys)
        resolve(retrieveSavedKeys())
      }
    })
  },
  retrieveSavedKeys
}
