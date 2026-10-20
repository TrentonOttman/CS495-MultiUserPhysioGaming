export const DISPLAY_NAME_MAX_LENGTH = 20;

export interface DisplayNameValidationResult {
    ok: boolean;
    displayName: string;
    error?: string;
}

export function validateDisplayName(input: unknown): DisplayNameValidationResult {
    if (typeof input !== "string") {
        return { ok: false, displayName: "", error: "Display name must be text." };
    }

    const trimmed = input.trim();

    if (trimmed.length === 0) {
        return { ok: false, displayName: "", error: "Display name cannot be empty." };
    }

    if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
        return { 
            ok: false, 
            displayName: trimmed, 
            error: `Display name cannot exceed ${DISPLAY_NAME_MAX_LENGTH} characters.` 
        };
    }

    return { ok: true, displayName: trimmed };
}