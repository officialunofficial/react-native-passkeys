import AuthenticationServices
import ExpoModulesCore
import Foundation

/// Handler the conditional-UI delegate calls back into. Intentionally
/// separate from `PasskeyResultHandler` so the regular-get and auto-fill
/// flows don't share the module's single-request context slot — a
/// conditional request can sit idle in the background for the screen's
/// lifetime without blocking user-initiated `get`/`create`/`createAccount`.
protocol PasskeyAutoFillResultHandler {
    func onAutoFillSuccess(_ data: AuthenticationResponseJSON)
    func onAutoFillFailure(_ error: Error)
}

/// Delegate for `ASAuthorizationController.performAutoFillAssistedRequests()`.
///
/// The JS caller invokes `getAutoFill()` on screen mount; the returned
/// promise resolves when the user picks a passkey from the iOS quicktype
/// bar / AutoFill sheet, or rejects when the user dismisses the
/// presenter, when another controller supersedes it, or when the caller
/// invokes `cancelAutoFill()` from JS.
///
/// Only the platform credential path matters here — conditional UI
/// surfaces platform (ASAuthorizationPlatformPublicKeyCredentialAssertion)
/// credentials, not security keys. Anything else falls through to the
/// generic failed path.
class PasskeyAutoFillDelegate: NSObject, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding
{
    private let handler: PasskeyAutoFillResultHandler

    init(handler: PasskeyAutoFillResultHandler) {
        self.handler = handler
    }

    @available(iOS 16.0, *)
    func performAutoFillAuth(controller: ASAuthorizationController) {
        controller.delegate = self
        controller.presentationContextProvider = self
        controller.performAutoFillAssistedRequests()
    }

    @available(iOS 13.0, *)
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return UIApplication.shared.keyWindow ?? ASPresentationAnchor()
    }

    @available(iOS 13.0, *)
    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        handler.onAutoFillFailure(error)
    }

    @available(iOS 15.0, *)
    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard
            let credential = authorization.credential
                as? ASAuthorizationPlatformPublicKeyCredentialAssertion
        else {
            handler.onAutoFillFailure((ASAuthorizationError(ASAuthorizationError.Code.failed)))
            return
        }

        // Mirrors the platform-assertion branch in PasskeyDelegate. Kept
        // local rather than extracted because the shared helper would
        // still need every #available guard copied through.
        var largeBlob: AuthenticationExtensionsLargeBlobOutputsJSON? =
            AuthenticationExtensionsLargeBlobOutputsJSON()
        if #available(iOS 17.0, *), let result = credential.largeBlob?.result {
            switch result {
            case .read(data: let blobData):
                largeBlob?.blob = blobData?.toBase64URLEncodedString()
            case .write(success: let successfullyWritten):
                largeBlob?.written = successfullyWritten
            @unknown default: break
            }
        }

        var prf: AuthenticationExtensionsPRFOutputsJSON?
        if #available(iOS 18.0, *) {
            prf = credential.prf.map {
                AuthenticationExtensionsPRFOutputsJSON(
                    results: Field.init(
                        wrappedValue: AuthenticationExtensionsPRFValuesJSON(
                            first: Field.init(wrappedValue: $0.first.serialize()),
                            second: Field.init(wrappedValue: $0.second.serialize())
                        )
                    )
                )
            }
        }

        let clientExtensionResults = AuthenticationExtensionsClientOutputsJSON(
            largeBlob: Field.init(wrappedValue: largeBlob),
            prf: Field.init(wrappedValue: prf)
        )

        let response = AuthenticatorAssertionResponseJSON(
            authenticatorData: Field.init(
                wrappedValue: credential.rawAuthenticatorData.toBase64URLEncodedString()),
            clientDataJSON: Field.init(
                wrappedValue: credential.rawClientDataJSON.toBase64URLEncodedString()),
            signature: Field.init(
                wrappedValue: credential.signature!.toBase64URLEncodedString()),
            userHandle: Field.init(wrappedValue: credential.userID!.toBase64URLEncodedString())
        )

        let result = AuthenticationResponseJSON(
            id: Field.init(wrappedValue: credential.credentialID.toBase64URLEncodedString()),
            rawId: Field.init(wrappedValue: credential.credentialID.toBase64URLEncodedString()),
            response: Field.init(wrappedValue: response),
            clientExtensionResults: Field.init(wrappedValue: clientExtensionResults)
        )

        handler.onAutoFillSuccess(result)
    }
}
