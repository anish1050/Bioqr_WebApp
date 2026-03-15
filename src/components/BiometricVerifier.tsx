import { useState, useCallback, useRef } from "react";

const API_BASE = ""; // Same as other components

interface UseBiometricVerificationReturn {
  verify: () => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Custom hook for biometric verification (WebAuthn).
 * Used to authorize sensitive operations like QR code generation.
 *
 * Requirements:
 * - User must be logged in (JWT in localStorage)
 * - User must have at least one enrolled credential
 * - Browser must support WebAuthn
 */
export function useBiometricVerification(): UseBiometricVerificationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setError(null);
  }, []);

  const verify = useCallback(async (): Promise<boolean> => {
    if (isLoading) {
      throw new Error("Verification already in progress");
    }

    // Check WebAuthn support
    if (typeof window === "undefined" || !window.webauthn) {
      throw new Error("Biometric authentication is not supported on this browser or device. Please use a modern browser with WebAuthn support.");
    }

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      throw new Error("You must be logged in to perform biometric verification.");
    }

    setIsLoading(true);
    setError(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Get challenge from backend
      const startResponse = await fetch(`${API_BASE}/bioqr/auth/webauthn/verify/start`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        signal: abortControllerRef.current.signal,
      });

      if (!startResponse.ok) {
        if (startResponse.status === 404) {
          const data = await startResponse.json();
          throw new Error(data.message || "No biometric credentials enrolled. Please enroll in Security settings first.");
        }
        const errData = await startResponse.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to start verification: ${startResponse.status}`);
      }

      const { challengeId, options } = await startResponse.json();

      // Step 2: Call WebAuthn API (browser prompts user for biometric)
      const assertion = await window.webauthn.request(options);

      if (!assertion) {
        throw new Error("Biometric verification was cancelled or failed.");
      }

      // Step 3: Send assertion back to backend for verification
      const completeResponse = await fetch(`${API_BASE}/bioqr/auth/webauthn/verify/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          challengeId,
          authenticationResponse: {
            id: assertion.id,
            rawId: assertion.rawId,
            type: "public-key",
            response: {
              clientDataJSON: assertion.response.clientDataJSON,
              authenticatorData: assertion.response.authenticatorData,
              signature: assertion.response.signature,
              userHandle: assertion.response.userHandle,
            },
          },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!completeResponse.ok) {
        const errData = await completeResponse.json().catch(() => ({}));
        throw new Error(errData.message || "Biometric verification failed. Please try again.");
      }

      const result = await completeResponse.json();

      if (!result.success || !result.verified) {
        throw new Error("Verification failed. Please try again.");
      }

      return true;
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Verification cancelled");
      }
      throw err;
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading]);

  return { verify, isLoading, error, reset };
}

export default useBiometricVerification;
