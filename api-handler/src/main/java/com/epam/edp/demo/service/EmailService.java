package com.epam.edp.demo.service;

public interface EmailService {

    void sendEmail(String toEmail, String subject, String body);
}
