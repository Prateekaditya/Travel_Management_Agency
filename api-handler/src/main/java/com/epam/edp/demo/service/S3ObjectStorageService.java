package com.epam.edp.demo.service;


import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3ObjectStorageService implements ObjectStorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final S3StorageProperties s3StorageProperties;

    @Override
    public void upload(byte[] content, String key, String contentType) {
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(s3StorageProperties.getBucket())
                .key(key)
                .contentType(contentType != null ? contentType : "application/octet-stream")
                .build();

        s3Client.putObject(request, RequestBody.fromBytes(content));
        log.debug("Uploaded object to S3: bucket={}, key={}", s3StorageProperties.getBucket(), key);
    }

    @Override
    public void delete(String key) {
        DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(s3StorageProperties.getBucket())
                .key(key)
                .build();
        s3Client.deleteObject(request);
        log.debug("Deleted object from S3: bucket={}, key={}", s3StorageProperties.getBucket(), key);
    }

    @Override
    public String getDocumentUrl(String s3Key) {
        if (s3Key == null || s3Key.isBlank()) return null;
        return String.format("https://%s.s3.amazonaws.com/%s",
                s3StorageProperties.getBucket(), s3Key);
    }

    @Override
    public String generatePresignedUrl(String s3Key, Duration duration) {
        if (s3Key == null || s3Key.isBlank()) return null;
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(s3StorageProperties.getBucket())
                .key(s3Key)
                .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(duration)
                .getObjectRequest(getObjectRequest)
                .build();
        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        String url = presignedRequest.url().toExternalForm();
        log.debug("Generated pre-signed URL for key={}, expires in {}", s3Key, duration);
        return url;
    }

    @Override
    public byte[] downloadBytes(String s3Key) {
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(s3StorageProperties.getBucket())
                .key(s3Key)
                .build();
        try (ResponseInputStream<GetObjectResponse> response = s3Client.getObject(request)) {
            return response.readAllBytes();
        } catch (IOException e) {
            log.error("Failed to download object from S3: key={}", s3Key, e);
            throw new RuntimeException("Failed to download document from storage", e);
        }
    }
}
