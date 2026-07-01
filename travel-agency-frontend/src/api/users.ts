import { apiRequest } from './client';

// ── User Profile Types ────────────────────────────────────────────────────────
export interface UserProfile {
  firstName: string;
  lastName: string;
  imageUrl: string | null;
  role: 'CUSTOMER' | 'TRAVEL_AGENT' | 'ADMIN';
}

export interface UpdateNameRequest {
  firstName: string;
  lastName: string;
}

export interface UpdateImageRequest {
  imageBase64: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  password: string;
}

export interface ConfirmEmailRequest {
  confirmationToken: string;
}

// ── API Functions ─────────────────────────────────────────────────────────────

/**
 * Get user profile information
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  return apiRequest<UserProfile>(`/users/${encodeURIComponent(userId)}`);
}

/**
 * Update user's first and last name
 */
export async function updateUserName(userId: string, data: UpdateNameRequest): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/users/${encodeURIComponent(userId)}/name`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Upload user avatar as Base64 encoded string
 */
export async function updateUserImage(userId: string, data: UpdateImageRequest): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/users/${encodeURIComponent(userId)}/image`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Change user password
 */
export async function updateUserPassword(userId: string, data: UpdatePasswordRequest): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/users/${encodeURIComponent(userId)}/password`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Request email change - sends confirmation link to new email
 */
export async function changeUserEmail(userId: string, data: ChangeEmailRequest): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/users/${encodeURIComponent(userId)}/email`, {
    method: 'PUT',
    body: data,
  });
}

/**
 * Confirm email change using token from confirmation email
 */
export async function confirmEmailChange(userId: string, data: ConfirmEmailRequest): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/users/${encodeURIComponent(userId)}/email/confirm`, {
    method: 'POST',
    body: data,
  });
}
