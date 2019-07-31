# Doordeck React Native SDK 

## Prerequisites

CocaoPods

`$ sudo gem install cocoapods`

## Getting started

1. Install via npm

	`$ npm install @doordeck/react-native-doordeck-sdk --save`

2. Link react-native files

	`$ react-native link @doordeck/react-native-doordeck-sdk`

### Mostly automatic installation

Coming soon - see manual install for now

### Manual installation


#### iOS
1. Open your `.xcworkspace` file in your `/ios` folder. If you do not have a .xcworkspace, open the `.xcodeproj` file.
2. In XCode, in the project navigator, right click `[your project's name folder]` ➜ `Add Files to [your project's name]`.
3. Go to one folder up and navigate to `node_modules/@doordeck/react-native-doordeck-sdk/ios` and add folder `doordeck-sdk`.
4. In XCode, in the project navigator, select your project. Set your Swift Language Version to `Swift 5` in your project's `Build Settings` ➜ `Swift Language Version`.
5. Add pod dependencies:
	Navigate in a terminal to your `[your react native project's folder]` ➜ `/ios`. 
	If there isn't a podfile you need to set it up by running `$ pod init`.
	Edit the podfile and add the following lines under # Pods for [your project's name]:
		
		platform :ios, "10.0"
		pod "QRCodeReader.swift", "~> 10.0"
		pod "ReachabilitySwift", "~> 4.3"
		pod "Alamofire", "~> 4.8"
		pod "Cache", "~> 5.2"
		pod "Sodium", "~> 0.8"

	In terminal run `$ pod install`
6. Add permissions:
	 Add the following to your project plist.

		“Privacy - Camera Usage Description” -> “NSCameraUsageDescription”
		“Privacy - NFC Scan Usage Description” -> “NFCReaderUsageDescription”
		“Privacy - Location When In Use Usage Description” -> “NSLocationAlwaysAndWhenInUseUsageDescription”

	To use NFC, turn it on in your project target settings `Capablities` ➜ `Near Field Communication Tag Reading`
7. To run your project, open the `.xcworkspace` file (not the .xcodeproj file) in your `/ios` folder and press run (`Cmd+R`).

#### Android

1. Edit your app `gradle` file: 

		minSdkVersion 21
		android {
			packagingOptions {
				pickFirst("META-INF/atomicfu.kotlin_module")
			}
		}
		repositories {
			maven { url "https://jitpack.io" }
		}

2. Add following to your `gradle.properties`

		android.useAndroidX=true
		android.enableJetifier=true

3.  To run your app, type `$ react-native run-android`




## Usage
```javascript
import doordeckSdk from '@doordeck/react-native-doordeck-sdk';

// Initialise the SDK with your AuthToken
doordeckSdk.initDoordeck(authToken)

// Show unlock screen (NFC/QR reader)
doordeckSdk.showUnlock()
```
  