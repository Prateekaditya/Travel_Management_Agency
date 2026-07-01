import { apiRequest, BASE_URL, setAuthToken } from './client';

export interface CaptchaChallenge {
  captchaId: string;
  imageBase64: string;
}

export async function fetchCaptcha(): Promise<CaptchaChallenge> {
  const response = await fetch(`${BASE_URL}/auth/captcha`);
  if (!response.ok) {
    throw new Error('Failed to load CAPTCHA. Please refresh the page.');
  }
  return response.json();
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  idToken: string;
  role: 'CUSTOMER' | 'TRAVEL_AGENT' | 'ADMIN';
  userName: string;
  email: string;
  userId: string;
}

export interface InitiateRegistrationRequest {
  firstName: string;
  lastName: string;
  email: string;
  recaptchaToken: string;
}

export interface InitiateRegistrationResponse {
  message: string;
  email: string;
}

export interface VerifyRegistrationEmailRequest {
  email: string;
  verificationCode: string;
}

export interface VerifyRegistrationEmailResponse {
  message: string;
  email: string;
}

export interface CompleteRegistrationRequest {
  email: string;
  password: string;
}

export interface CompleteRegistrationResponse {
  message: string;
  nextRoute: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyCodeRequest {
  email: string;
  verificationCode: string;
}

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
}

export interface AuthMessageResponse {
  message: string;
}

export async function signIn(credentials: SignInRequest): Promise<SignInResponse> {
  const data = await apiRequest<SignInResponse>('/auth/sign-in', {
    method: 'POST',
    body: credentials,
  });
  // Store the token globally so subsequent requests are authenticated
  setAuthToken(data.idToken);
  return data;
}

export async function initiateRegistration(
  data: InitiateRegistrationRequest
): Promise<InitiateRegistrationResponse> {
  return apiRequest<InitiateRegistrationResponse>('/auth/register', {
    method: 'POST',
    body: data,
  });
}

export async function verifyRegistrationEmail(
  data: VerifyRegistrationEmailRequest
): Promise<VerifyRegistrationEmailResponse> {
  return apiRequest<VerifyRegistrationEmailResponse>('/auth/register/verify', {
    method: 'POST',
    body: data,
  });
}

export async function completeRegistration(
  data: CompleteRegistrationRequest
): Promise<CompleteRegistrationResponse> {
  return apiRequest<CompleteRegistrationResponse>('/auth/register/complete', {
    method: 'POST',
    body: data,
  });
}

export async function forgotPassword(payload: ForgotPasswordRequest): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: payload,
  });
}

export async function verifyResetCode(payload: VerifyCodeRequest): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>('/auth/verify-code', {
    method: 'POST',
    body: payload,
  });
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<AuthMessageResponse> {
  return apiRequest<AuthMessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: payload,
  });
}
