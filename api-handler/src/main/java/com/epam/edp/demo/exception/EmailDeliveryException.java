package com.epam.edp.demo.exception;

public class EmailDeliveryException extends RuntimeException {
    public EmailDeliveryException(String message){
        super(message);
    }
}
