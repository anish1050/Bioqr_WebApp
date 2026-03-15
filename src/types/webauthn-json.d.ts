// Type definitions for @github/webauthn-json polyfill
interface WebAuthnRequestOptions {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    id: string | ArrayBuffer;
    type: 'public-key';
    transports?: string[];
  }>;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

interface WebAuthnResponse {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string | null;
  };
}

interface WebAuthnRegistrationOptions {
  challenge: string;
  timeout?: number;
  rpId: string;
  rpName?: string;
  userID?: string;
  userName?: string;
  userDisplayName?: string;
  attestationPreference?: 'none' | 'indirect' | 'direct';
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    userVerification?: 'required' | 'preferred' | 'discouraged';
    requireResidentKey?: boolean;
  };
  pubKeyCredParams?: Array<{
    alg: number;
    type: 'public-key';
  }>;
  excludeCredentials?: Array<{
    id: string | ArrayBuffer;
    type: 'public-key';
    transports?: string[];
  }>;
}

interface WebAuthnRegistrationResponse {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
  };
}

interface WebAuthnJSON {
  request(options: WebAuthnRequestOptions): Promise<WebAuthnResponse>;
  create(options: WebAuthnRegistrationOptions): Promise<WebAuthnRegistrationResponse>;
}

declare global {
  interface Window {
    webauthn: WebAuthnJSON;
  }
}

export {};
