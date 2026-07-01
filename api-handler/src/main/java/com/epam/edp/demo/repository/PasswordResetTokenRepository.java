package com.epam.edp.demo.repository;

import com.epam.edp.demo.model.PasswordResetToken;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends MongoRepository<PasswordResetToken, String> {

    Optional<PasswordResetToken> findTopByEmailOrderByExpiresAtDesc(String email);

    Optional<PasswordResetToken> findTopByEmailAndVerifiedTrueOrderByExpiresAtDesc(String email);

    void deleteByEmail(String email);
}
