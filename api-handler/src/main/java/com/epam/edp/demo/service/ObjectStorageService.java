package com.epam.edp.demo.service;

import java.time.Duration;

public interface ObjectStorageService {
    void upload(byte[] content, String key, String contentType);
    void delete(String key);
    String getDocumentUrl(String s3Key);

    /**
     * Generates a pre-signed URL for the given S3 key, valid for the specified duration.
     * Use this for travel-agent document download links.
     */
    String generatePresignedUrl(String s3Key, Duration duration);

    /**
     * Downloads raw bytes of an object from S3.
     */
    byte[] downloadBytes(String s3Key);
}
