# React Native Passkeys

This is an Expo module to help you create and authenticate with passkeys on iOS, Android & web with the same api. The library aims to stay close to the standard [`navigator.credentials`](https://w3c.github.io/webappsec-credential-management/#framework-credential-management). More specifically, we provide an api for `get` & `create` functions (since these are the functions available cross-platform).

The adaptations we make are simple niceties like providing automatic conversion of base64-url encoded strings to buffer. This is also done to make it easier to pass the values to the native side.

Further niceties include some flag functions that indicate support for certain features.

## Installation

```sh
npx expo install react-native-passkeys
```

## iOS Setup

#### 1. Host an Apple App Site Association (AASA) file

For Passkeys to work on iOS, you'll need to host an AASA file on your domain. This file is used to verify that your app is allowed to handle the domain you are trying to authenticate with. This must be hosted on a site with a valid SSL certificate.

The file should be hosted at:

```
https://<your_domain>/.well-known/apple-app-site-association
```

Note there is no `.json` extension for this file but the format is json. The contents of the file should look something like this:

```json
{
  "webcredentials": {
    "apps": ["<teamID>.<bundleID>"]
  }
}
```

Replace `<teamID>` with your Apple Team ID and `<bundleID>` with your app's bundle identifier.

#### 2. Add Associated Domains

Add the following to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "associatedDomains": ["webcredentials:<your_domain>"]
    }
  }
}
```

Replace `<your_domain>` with the domain you are hosting the AASA file on. For example, if you are hosting the AASA file on `https://example.com/.well-known/apple-app-site-association`, you would add `example.com` to the `associatedDomains` array.

#### 3. Add minimum deployment target

Add the following to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "15.0"
          }
        }
      ]
    ]
  }
}
```

#### 4. Prebuild and run your app

```sh
npx expo prebuild -p ios
npx expo run:ios # or build in the cloud with EAS
```

## macOS Setup (react-native-macos)

Platform passkeys are supported on **macOS 13.4+** via the same `AuthenticationServices`
APIs used on iOS. The JavaScript API is identical — `create()`, `get()`, `isSupported()`,
`isAccountCreationSupported()` / `createAccount()` all work the same way. Only the native
presentation differs (the system sheet is anchored to the app's key `NSWindow` instead of a
`UIWindow`).

This module ships macOS support through the Expo `apple` platform, so it autolinks into a
react-native-macos app the same way it does on iOS. Fast Account Creation
(`createAccount` / `isAccountCreationSupported`) requires **macOS 26+** (mirrors the iOS 26
requirement); on older macOS it reports unsupported and throws if called.

#### 1. Host an Apple App Site Association (AASA) file

macOS uses the **same** AASA file and `webcredentials` association as iOS (see the iOS
section above). A single AASA hosted at
`https://<your_domain>/.well-known/apple-app-site-association` covers both platforms. Add the
macOS app's `<teamID>.<bundleID>` to the `webcredentials.apps` array (it can be the same app
identifier if you share a bundle ID across platforms).

#### 2. Add the Associated Domains entitlement to the macOS app

The consuming macOS app target must declare the **Associated Domains** entitlement with a
`webcredentials:<rpId>` entry, exactly like iOS:

- Entitlement key: `com.apple.developer.associated-domains`
- Value: an array containing `webcredentials:<your_domain>` (do **not** include a scheme or
  path — just the registrable domain, e.g. `webcredentials:example.com`).

In an Expo-managed react-native-macos app this is expressed the same way iOS is, scoped to the
macOS target. The `rpId` you pass to `create()` / `get()` must match the domain in this
entitlement and in the hosted AASA file. This module does **not** hardcode any rpId — it is
always taken from the request options at call time.

> Note: macOS additionally requires the app to be code-signed with a provisioning profile /
> Developer ID that includes the Associated Domains capability for the entitlement to take
> effect at runtime. Unlike iOS, biometrics are **not** required on macOS — the system falls
> back to the login password, a nearby iPhone, or Apple Watch — so this module does not gate
> passkey requests on local biometrics on macOS.

#### 3. Minimum deployment target

Set the macOS deployment target to **13.4** or higher (this is the floor used by
react-native-macos 0.85 and the minimum where platform passkeys are usable). The podspec
declares `:osx => '13.4'`.

## Android Setup

#### 1. Host an `assetlinks.json` File

For Passkeys to work on Android, you'll need to host an `assetlinks.json` file on your domain. This file is used to verify that your app is allowed to handle the domain you are trying to authenticate with. This must be hosted on a site with a valid SSL certificate.

The file should be hosted at:

```
https://<your_domain>/.well-known/assetlinks.json
```

and should look something like this (you can generate this file using the [Android Asset Links Assistant](https://developers.google.com/digital-asset-links/tools/generator)):

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls",
      "delegate_permission/common.get_login_creds"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "<package_name>",
      "sha256_cert_fingerprints": ["<sha256_cert_fingerprint>"]
    }
  }
]
```

Replace `<package_name>` with your app's package name and `<sha256_cert_fingerprint>` with your app's SHA256 certificate fingerprint.

The `get_login_creds` relation is required for passkey flows via Android's Credential Manager — without it, calls will fail silently or return "no matching credentials". `handle_all_urls` alone is only enough for App Links. See [Credential Manager prerequisites](https://developer.android.com/identity/credential-manager/prerequisites).

> **Note on DAL caching:** Android caches `assetlinks.json` for up to 24 hours. After updating, reinstall the app on your device/emulator to force a fresh fetch.

#### 2. Modify Expo Build Properties

Next, you'll need to modify the `compileSdkVersion` in your `app.json` to be at least 34.

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 34
          }
        }
      ]
    ]
  }
}
```

#### 3. Prebuild and run your app

```sh
npx expo prebuild -p android
npx expo run:android # or build in the cloud with EAS
```
