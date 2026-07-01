package com.epam.edp.demo.exception;

import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.lang.reflect.Method;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleValidationErrors_withFieldError_returnsFirstErrorMessage() throws Exception {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "signInRequestDTO");
        bindingResult.addError(new FieldError("signInRequestDTO", "email", "Email format is invalid"));
        bindingResult.addError(new FieldError("signInRequestDTO", "password", "Password must not be blank"));
        MethodArgumentNotValidException ex = buildException(bindingResult);

        ResponseEntity<ApiErrorResponse> response = handler.handleValidationErrors(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError()).isEqualTo("Validation failed");
        assertThat(response.getBody().getDetails()).contains("email: Email format is invalid");
    }

    @Test
    void handleValidationErrors_withoutFieldError_returnsDefaultMessage() throws Exception {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "signInRequestDTO");
        MethodArgumentNotValidException ex = buildException(bindingResult);

        ResponseEntity<ApiErrorResponse> response = handler.handleValidationErrors(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError()).isEqualTo("Validation failed");
        assertThat(response.getBody().getDetails()).isEmpty();
    }

    private MethodArgumentNotValidException buildException(BeanPropertyBindingResult bindingResult)
            throws NoSuchMethodException {
        Method method = TestController.class.getDeclaredMethod("handle", String.class);
        MethodParameter parameter = new MethodParameter(method, 0);
        return new MethodArgumentNotValidException(parameter, bindingResult);
    }

    private static class TestController {
        void handle(String value) {
        }
    }
}
