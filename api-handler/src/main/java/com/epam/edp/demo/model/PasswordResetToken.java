package com.epam.edp.demo.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
@Document(collection = "password_reset_tokens")
public class PasswordResetToken {
    @Id
    String id;

    @Indexed
    String email;

    String code;

    @Indexed(expireAfter = "0s")
    Instant expiresAt;

    boolean verified;

    @Builder.Default
    int attemptCount = 0;

    public boolean isValid(){
        return Instant.now().isBefore(expiresAt);
    }
}
