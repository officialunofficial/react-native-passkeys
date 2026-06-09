import type { AccountCreationResponse, AuthenticationResponseJSON, FastAccountCreationOptions, PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON, CreationResponse } from "./ReactNativePasskeys.types";
declare const _default: {
    isSupported(): boolean;
    isAutoFillAvalilable(): boolean;
    get(request: PublicKeyCredentialRequestOptionsJSON): Promise<AuthenticationResponseJSON | null>;
    create(request: PublicKeyCredentialCreationOptionsJSON): Promise<CreationResponse | null>;
    isAccountCreationSupported(): boolean;
    createAccount(request: FastAccountCreationOptions): Promise<AccountCreationResponse | null>;
};
export default _default;
//# sourceMappingURL=ReactNativePasskeysModule.d.ts.map