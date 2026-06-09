import { requireNativeModule } from "expo-modules-core";

import { NotSupportedError } from "./errors";

import type {
	AccountCreationResponse,
	AuthenticationResponseJSON,
	FastAccountCreationOptions,
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
	CreationResponse,
} from "./ReactNativePasskeys.types";

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
	isSupported(): boolean {
		return passkeys.isSupported();
	},

	// Note: the public JS name keeps the historical typo ("Avalilable"); the
	// native function is correctly spelled "isAutoFillAvailable".
	isAutoFillAvalilable(): boolean {
		return passkeys.isAutoFillAvailable();
	},

	get(
		request: PublicKeyCredentialRequestOptionsJSON,
	): Promise<AuthenticationResponseJSON | null> {
		return passkeys.get(request);
	},

	async create(request: PublicKeyCredentialCreationOptionsJSON): Promise<CreationResponse | null> {
		if (!this.isSupported()) throw new NotSupportedError();

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

	isAccountCreationSupported(): boolean {
		return passkeys.isAccountCreationSupported?.() ?? false;
	},

	async createAccount(request: FastAccountCreationOptions): Promise<AccountCreationResponse | null> {
		if (!this.isAccountCreationSupported()) throw new NotSupportedError();

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
