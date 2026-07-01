package com.epam.edp.demo.service;

public interface PasswordResetService {
    
    void initiateForgotPassword(String email);
    void verifyCode(String email, String verificationCode);
    void resetPassword(String email, String newPassword);

}
