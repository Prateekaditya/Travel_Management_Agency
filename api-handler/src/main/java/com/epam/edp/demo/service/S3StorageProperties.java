package com.epam.edp.demo.service;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "aws.s3")
public class S3StorageProperties {
    private String bucket;
    private String prefix = "bookings";
}
