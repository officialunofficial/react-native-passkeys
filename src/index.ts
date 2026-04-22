// Import the native module. On web, it will be resolved to ReactNativePasskeys.web.ts
// and on native platforms to ReactNativePasskeys.ts
import ReactNativePasskeysModule from "./ReactNativePasskeysModule";

import type {
	AccountCreationResponse,
	AuthenticationExtensionsLargeBlobInputs,
	AuthenticationExtensionsPRFInputs,
	AuthenticationResponseJSON,
	FastAccountCreationOptions,
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
	CreationResponse,
} from "./ReactNativePasskeys.types";

export function isSupported(): boolean {
	return ReactNativePasskeysModule.isSupported();
}

export function isAutoFillAvalilable(): boolean {
	return ReactNativePasskeysModule.isAutoFillAvalilable();
}

/**
 * Conditional UI / AutoFill support check. iOS 16+ surfaces passkeys
 * in the quicktype bar without an explicit tap; Android 14+ Credential
 * Manager has a similar flow (not wired here yet). Web delegates to
 * `PublicKeyCredential.isConditionalMediationAvailable()`.
 *
 * The iOS native function is correctly spelled `isAutoFillAvailable`;
 * the older TS alias (`isAutoFillAvalilable`) routed through the web
 * fallback's typo'd name. Both exports exist so we don't break
 * downstream callers.
 */
export function isAutoFillAvailable(): boolean {
	// Prefer the correctly-spelled native function when it exists.
	// Cast away the type because the module factory doesn't know about
	// the new function until `.d.ts` regenerates.
	const module = ReactNativePasskeysModule as unknown as {
		isAutoFillAvailable?: () => boolean;
		isAutoFillAvalilable?: () => boolean;
	};
	return module.isAutoFillAvailable?.() ?? module.isAutoFillAvalilable?.() ?? false;
}

/**
 * Fire a conditional-UI WebAuthn assertion. The returned promise
 * resolves with the user-picked credential OR `null` when the request
 * is cancelled (either programmatically via `cancelAutoFill()` or by
 * the user dismissing the presenter). It does NOT reject on user
 * cancellation — that's the happy path for "user chose not to sign in
 * yet", not an error.
 *
 * Only iOS 16+ supports this natively today; pre-16 (and Android /
 * web without `PublicKeyCredential.isConditionalMediationAvailable()`)
 * resolve with `null` immediately so the caller's branch logic stays
 * simple. Check `isAutoFillAvailable()` before calling if you want to
 * skip the whole dance upfront.
 */
export async function getAutoFill(
	request: Omit<PublicKeyCredentialRequestOptionsJSON, "extensions"> & {
		extensions?: {
			largeBlob?: AuthenticationExtensionsLargeBlobInputs;
			prf?: AuthenticationExtensionsPRFInputs;
		};
	},
): Promise<AuthenticationResponseJSON | null> {
	const module = ReactNativePasskeysModule as unknown as {
		getAutoFill?: (
			r: typeof request,
		) => Promise<AuthenticationResponseJSON | null>;
	};
	if (!module.getAutoFill) {
		return null;
	}
	return await module.getAutoFill(request);
}

/**
 * Cancel the in-flight auto-fill assertion, if any. Idempotent. The
 * underlying `getAutoFill()` promise resolves with `null` (not
 * rejects) so callers can treat it as "the user didn't pick
 * anything" uniformly.
 */
export async function cancelAutoFill(): Promise<void> {
	const module = ReactNativePasskeysModule as unknown as {
		cancelAutoFill?: () => Promise<void>;
	};
	await module.cancelAutoFill?.();
}

export function isAccountCreationSupported(): boolean {
	return ReactNativePasskeysModule.isAccountCreationSupported();
}

export async function create(
	request: Omit<PublicKeyCredentialCreationOptionsJSON, "extensions"> & {
		// Platform support:
		// - iOS: largeBlob (iOS 17+), prf (iOS 18+)
		// - Android: prf
		// - Web: largeBlob, prf
		extensions?: {
			largeBlob?: AuthenticationExtensionsLargeBlobInputs;
			prf?: AuthenticationExtensionsPRFInputs;
			// Request credProps on registration to learn discoverability.
			credProps?: boolean;
		};
	} & Pick<CredentialCreationOptions, "signal">,
): Promise<CreationResponse | null> {
	return await ReactNativePasskeysModule.create(request);
}

export async function get(
	request: Omit<PublicKeyCredentialRequestOptionsJSON, "extensions"> & {
		// Platform support:
		// - iOS: largeBlob (iOS 17+), prf (iOS 18+)
		// - Android: prf
		// - Web: largeBlob, prf
		extensions?: {
			largeBlob?: AuthenticationExtensionsLargeBlobInputs;
			prf?: AuthenticationExtensionsPRFInputs;
		};
	},
): Promise<AuthenticationResponseJSON | null> {
	return await ReactNativePasskeysModule.get(request);
}

export async function createAccount(
	request: FastAccountCreationOptions,
): Promise<AccountCreationResponse | null> {
	return await ReactNativePasskeysModule.createAccount(request);
}
