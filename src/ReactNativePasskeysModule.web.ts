import { NotSupportedError } from "./errors";
import { base64URLStringToBuffer, bufferToBase64URLString } from "./utils/base64";
import { normalizePRFInputs } from "./utils/prf";

import type {
	AccountCreationResponse,
	AuthenticationCredential,
	AuthenticationExtensionsClientInputs,
	AuthenticationExtensionsClientOutputs,
	AuthenticationExtensionsClientOutputsJSON,
	AuthenticationResponseJSON,
	FastAccountCreationOptions,
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
	RegistrationCredential,
	CreationResponse,
} from "./ReactNativePasskeys.types";

// Single AbortController for the currently-in-flight conditional
// `navigator.credentials.get({ mediation: "conditional" })` call. Kept
// outside the module object so `cancelAutoFill` can reach it without a
// `this`-bound method dance.
let autoFillAbort: AbortController | null = null;

export default {
	get name(): string {
		return "ReactNativePasskeys";
	},

	isAutoFillAvalilable(): Promise<boolean> {
		return window.PublicKeyCredential.isConditionalMediationAvailable?.() ?? Promise.resolve(false);
	},

	// Correctly-spelled alias, matches the native module's Function
	// name. New callers prefer this.
	async isAutoFillAvailable(): Promise<boolean> {
		return (
			(await window.PublicKeyCredential.isConditionalMediationAvailable?.()) ?? false
		);
	},

	isSupported() {
		return (
			window?.PublicKeyCredential !== undefined && typeof window.PublicKeyCredential === "function"
		);
	},

	isAccountCreationSupported() {
		return false;
	},

	/**
	 * Web conditional-UI via `navigator.credentials.get({ mediation:
	 * "conditional" })`. Resolves with `null` when the user picks
	 * nothing (aborted via `cancelAutoFill` or the browser ends the
	 * conditional-UI session). Rejects only on unexpected errors.
	 */
	async getAutoFill({
		...request
	}: PublicKeyCredentialRequestOptionsJSON): Promise<AuthenticationResponseJSON | null> {
		if (!this.isSupported()) return null;
		if (!(await this.isAutoFillAvailable())) return null;

		// Supersede any prior conditional call so a re-mount doesn't
		// leak an abortable promise.
		autoFillAbort?.abort();
		const controller = new AbortController();
		autoFillAbort = controller;

		let credential: AuthenticationCredential | null;
		try {
			credential = (await navigator.credentials.get({
				mediation: "conditional",
				signal: controller.signal,
				// biome-ignore lint/suspicious/noExplicitAny: largeBlob.write mismatch between JSON (base64url string) and DOM BufferSource
				publicKey: ({
					...request,
					challenge: base64URLStringToBuffer(request.challenge),
					allowCredentials: request.allowCredentials?.map((cred) => ({
						...cred,
						id: base64URLStringToBuffer(cred.id),
						transports: (cred.transports ?? undefined) as
							| AuthenticatorTransport[]
							| undefined,
					})),
				} as any),
			})) as AuthenticationCredential | null;
		} catch (error) {
			if (
				error instanceof DOMException &&
				(error.name === "AbortError" || error.name === "NotAllowedError")
			) {
				return null;
			}
			throw error;
		} finally {
			if (autoFillAbort === controller) {
				autoFillAbort = null;
			}
		}

		if (!credential) return null;

		const extensions =
			credential.getClientExtensionResults() as AuthenticationExtensionsClientOutputs;
		const { largeBlob, prf, credProps, ...clientExtensionResults } = extensions;

		return {
			id: credential.id,
			rawId: credential.id,
			response: {
				clientDataJSON: bufferToBase64URLString(credential.response.clientDataJSON),
				authenticatorData: bufferToBase64URLString(credential.response.authenticatorData),
				signature: bufferToBase64URLString(credential.response.signature),
				userHandle: credential.response.userHandle
					? bufferToBase64URLString(credential.response.userHandle)
					: undefined,
			},
			authenticatorAttachment: undefined,
			clientExtensionResults: {
				...clientExtensionResults,
				...(largeBlob && {
					largeBlob: {
						...largeBlob,
						blob: largeBlob?.blob ? bufferToBase64URLString(largeBlob.blob) : undefined,
					},
				}),
				...(prf?.results && {
					prf: {
						results: {
							first: bufferToBase64URLString(prf.results.first),
							second: prf.results.second
								? bufferToBase64URLString(prf.results.second)
								: undefined,
						},
					},
				}),
				...(credProps && { credProps }),
			} satisfies AuthenticationExtensionsClientOutputsJSON,
			type: "public-key",
		};
	},

	async cancelAutoFill(): Promise<void> {
		autoFillAbort?.abort();
		autoFillAbort = null;
	},

	async create({
		signal,
		...request
	}: PublicKeyCredentialCreationOptionsJSON &
		Pick<CredentialCreationOptions, "signal">): Promise<CreationResponse | null> {
		if (!this.isSupported()) throw new NotSupportedError();

		const credential = (await navigator.credentials.create({
			signal,
			publicKey: {
				...request,
				challenge: base64URLStringToBuffer(request.challenge),
				user: { ...request.user, id: base64URLStringToBuffer(request.user.id) },
				excludeCredentials: request.excludeCredentials?.map((cred) => ({
					...cred,
					id: base64URLStringToBuffer(cred.id),
					// TODO: remove the override when typescript has updated webauthn types
					transports: (cred.transports ?? undefined) as AuthenticatorTransport[] | undefined,
				})),
				// The DOM WebAuthn types declare `largeBlob.write` as
				// `BufferSource`, but our JSON input type carries it as
				// base64url. The upstream `get` path has the same mismatch
				// via a `@ts-expect-error:` comment in the extensions block;
				// we cast here to match.
				// biome-ignore lint/suspicious/noExplicitAny: WebAuthn L3 BufferSource vs JSON base64url shape mismatch
				extensions: ({
					...request.extensions,
					prf: normalizePRFInputs(request),
				} as any),
			},
		})) as RegistrationCredential;

		// TODO: remove the override when typescript has updated webauthn types
		const extensions =
			credential?.getClientExtensionResults() as AuthenticationExtensionsClientOutputs;
		warnUserOfMissingWebauthnExtensions(request.extensions, extensions);
		const { largeBlob, prf, credProps, ...clientExtensionResults } = extensions;

		if (!credential) return null;

		return {
			id: credential.id,
			rawId: credential.id,
			response: {
				clientDataJSON: bufferToBase64URLString(credential.response.clientDataJSON),
				attestationObject: bufferToBase64URLString(credential.response.attestationObject),
				getPublicKey() {
					// Note: The standard web API returns ArrayBuffer | null, but we convert to Base64URLString
					// for cross-platform consistency with iOS/Android implementations
					const publicKey = credential.response.getPublicKey();
					return publicKey ? bufferToBase64URLString(publicKey) : null;
				},
			},
			authenticatorAttachment: undefined,
			type: "public-key",
			clientExtensionResults: {
				...clientExtensionResults,
				...(largeBlob && {
					largeBlob: {
						...largeBlob,
						blob: largeBlob?.blob ? bufferToBase64URLString(largeBlob.blob) : undefined,
					},
				}),
				...(prf?.results && {
					prf: {
						enabled: prf.enabled,
						results: {
							first: bufferToBase64URLString(prf.results.first),
							second: prf.results.second ? bufferToBase64URLString(prf.results.second) : undefined,
						},
					},
				}),
				...(credProps && { credProps }),
			} satisfies AuthenticationExtensionsClientOutputsJSON,
		};
	},

	async get({
		mediation,
		signal,
		...request
	}: PublicKeyCredentialRequestOptionsJSON &
		Pick<
			CredentialRequestOptions,
			"mediation" | "signal"
		>): Promise<AuthenticationResponseJSON | null> {
		const credential = (await navigator.credentials.get({
			mediation,
			signal,
			publicKey: {
				...request,
				extensions: {
					...request.extensions,
					prf: normalizePRFInputs(request),
					/**
					 * the navigator interface doesn't have a largeBlob property
					 * as it may not be supported by all browsers
					 *
					 * browsers that do not support the extension will just ignore the property so it's safe to include it
					 *
					 * @ts-expect-error:*/
					largeBlob: request.extensions?.largeBlob?.write
						? {
								...request.extensions?.largeBlob,
								write: base64URLStringToBuffer(request.extensions.largeBlob.write),
							}
						: request.extensions?.largeBlob,
				},
				challenge: base64URLStringToBuffer(request.challenge),
				allowCredentials: request.allowCredentials?.map((cred) => ({
					...cred,
					id: base64URLStringToBuffer(cred.id),
					// TODO: remove the override when typescript has updated webauthn types
					transports: (cred.transports ?? undefined) as AuthenticatorTransport[] | undefined,
				})),
			},
		})) as AuthenticationCredential;

		// TODO: remove the override when typescript has updated webauthn types
		const extensions =
			credential?.getClientExtensionResults() as AuthenticationExtensionsClientOutputs;
		warnUserOfMissingWebauthnExtensions(request.extensions, extensions);
		const { largeBlob, prf, credProps, ...clientExtensionResults } = extensions;

		if (!credential) return null;

		return {
			id: credential.id,
			rawId: credential.id,
			response: {
				clientDataJSON: bufferToBase64URLString(credential.response.clientDataJSON),
				authenticatorData: bufferToBase64URLString(credential.response.authenticatorData),
				signature: bufferToBase64URLString(credential.response.signature),
				userHandle: credential.response.userHandle
					? bufferToBase64URLString(credential.response.userHandle)
					: undefined,
			},
			authenticatorAttachment: undefined,
			clientExtensionResults: {
				...clientExtensionResults,
				...(largeBlob && {
					largeBlob: {
						...largeBlob,
						blob: largeBlob?.blob ? bufferToBase64URLString(largeBlob.blob) : undefined,
					},
				}),
				...(prf?.results && {
					prf: {
						results: {
							first: bufferToBase64URLString(prf.results.first),
							second: prf.results.second ? bufferToBase64URLString(prf.results.second) : undefined,
						},
					},
				}),
				...(credProps && { credProps }),
			} satisfies AuthenticationExtensionsClientOutputsJSON,
			type: "public-key",
		};
	},

	async createAccount(
		_request: FastAccountCreationOptions,
	): Promise<AccountCreationResponse | null> {
		throw new NotSupportedError(
			"Fast account creation with passkeys is only available through the native iOS API.",
		);
	},
};

/**
 *  warn the user about extensions that they tried to use that are not supported
 */
const warnUserOfMissingWebauthnExtensions = (
	requestedExtensions: AuthenticationExtensionsClientInputs | undefined,
	clientExtensionResults: AuthenticationExtensionsClientOutputs | undefined,
) => {
	if (clientExtensionResults) {
		for (const key in requestedExtensions) {
			if (typeof clientExtensionResults[key] === "undefined") {
				alert(
					`Webauthn extension ${key} is undefined -- your browser probably doesn't know about it`,
				);
			}
		}
	}
};
