import { requireNativeModule } from "expo-modules-core";
import { NotSupportedError } from "./errors";
// It loads the native module object from the JSI or falls back to
// the bridge module (from NativeModulesProxy) if the remote debugger is on.
const passkeys = requireNativeModule("ReactNativePasskeys");
// [macOS] Forward each method through `passkeys` explicitly instead of spreading
// `{ ...passkeys }`. On react-native-macos the native module is a JSI host object
// whose method descriptors are not reported as enumerable, so object spread drops
// every method (`isSupported`, `get`, … become undefined) even though
// `Object.keys(passkeys)` still lists them. This works on iOS but breaks on macOS.
// Calling `passkeys.<method>(...)` directly is platform-safe.
export default {
    isSupported() {
        return passkeys.isSupported();
    },
    // Note: the public JS name keeps the historical typo ("Avalilable"); the
    // native function is correctly spelled "isAutoFillAvailable".
    isAutoFillAvalilable() {
        return passkeys.isAutoFillAvailable();
    },
    get(request) {
        return passkeys.get(request);
    },
    async create(request) {
        if (!this.isSupported())
            throw new NotSupportedError();
        const credential = await passkeys.create(request);
        return {
            ...credential,
            response: {
                ...credential.response,
                getPublicKey() {
                    return credential.response?.publicKey;
                },
            },
        };
    },
    isAccountCreationSupported() {
        return passkeys.isAccountCreationSupported?.() ?? false;
    },
    async createAccount(request) {
        if (!this.isAccountCreationSupported())
            throw new NotSupportedError();
        const credential = await passkeys.createAccount(request);
        return {
            ...credential,
            response: {
                ...credential.response,
                getPublicKey() {
                    return credential.response?.publicKey;
                },
            },
        };
    },
};
//# sourceMappingURL=ReactNativePasskeysModule.js.map