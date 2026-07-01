package com.epam.edp.demo.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

import java.time.LocalDateTime;

/**
 * Refresh Token entity for managing long-lived tokens.
 * Enables logout by server-side revocation and session persistence.
 */
@Document(collection = "refresh_tokens")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    private String id;

    @DocumentReference
    private User user;

    private String token;

    private LocalDateTime expirationDate;

    private LocalDateTime createdAt;

    private boolean revoked;

    public boolean isValid() {
        return !revoked && LocalDateTime.now().isBefore(expirationDate);
    }
}
