# Doordeck Javascript SDK 

## Archived
This project is no longer maintained, please switch to [the Doordeck headless SDK](https://www.npmjs.com/package/@doordeck/doordeck-headless-sdk).


## Getting started

1. Install via npm

	`$ npm install @doordeck/javascript-doordeck-sdk --save`


## Usage

```javascript
import doordeckSdk from '@doordeck/javascript-doordeck-sdk'

// Initialise the SDK with your AuthToken
// 'AuthToken': Base64 encoded Ed25519 public key
// 'BaseUrl' : Base URL for the Doordeck SDK. If 'null' then the production URL is going to be used.

doordeckSdk.doordeckInit(authToken, baseUrl).then(response => {
	// doordeck successfully initialised
}, error => {
	if (error.state === 'verify') {
		// show verification screen
	} else {
		// catch error
	}
})


// Unlock device
// 'deviceId': id of the key you are sharing

doordeckSdk.device.unlock(deviceId)


// Get user and share key
// 'userEmailorId': email or userId of the person you want to share it with
// 'deviceId': id of the key you are sharing
// 'role': 'ADMIN' or 'USER'
// 'startDate/endDate': Unix Timestamp. For permanent key sharing set both to null.

doordeckSdk.device.getUser(userEmailorId).then(response => {
	var user = {'userId': response.data.user.id, 'publicKey': response.data.user.publicKey, 'email': response.data.email}
	Doordeck.device.share(deviceId, user, role, startDate, endDate)
})
```

## Documentation

https://doordeck.com/developer
