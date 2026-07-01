export type SignInResponse = {
  idToken: string;
  role: string;
  userName: string;
  email: string;
  userId: string;
};

export type ErrorResponse = {
  message?: string;
};

export type SignInErrors = {
  email?: string;
  password?: string;
  lock?: string;
};
