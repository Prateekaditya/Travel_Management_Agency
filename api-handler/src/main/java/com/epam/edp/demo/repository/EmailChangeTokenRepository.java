package com.epam.edp.demo.repository;

import com.epam.edp.demo.model.EmailChangeToken;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface EmailChangeTokenRepository extends MongoRepository<EmailChangeToken, String> {
    Optional<EmailChangeToken> findByToken(String token);
    void deleteByUserId(String userId);
}