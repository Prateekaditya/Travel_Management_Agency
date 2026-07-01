package com.epam.edp.demo.model;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
@Document(collection = "email_change_tokens")
public class EmailChangeToken {
    @Id
    String id;
    String userId;
    String newEmail;
    @Indexed(unique = true)
    String token;
    @Indexed(expireAfter = "0s")
    Instant expiresAt;
}