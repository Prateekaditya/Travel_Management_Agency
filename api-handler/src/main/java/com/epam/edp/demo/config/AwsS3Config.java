package com.epam.edp.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.*;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.auth.StsAssumeRoleCredentialsProvider;

@Configuration
public class AwsS3Config {

    @Bean
    public AwsCredentialsProvider awsCredentialsProvider(
            @Value("${AWS_ACCESS_KEY_ID:}") String accessKeyId,
            @Value("${AWS_SECRET_ACCESS_KEY:}") String secretKey,
            @Value("${AWS_SESSION_TOKEN:}") String sessionToken,
            @Value("${AWS_ROLE_ARN:}") String roleArn,
            @Value("${aws.region}") String region) {

        // Build base credentials (works with both IAM user keys and STS tokens)
        AwsCredentials baseCredentials = (sessionToken != null && !sessionToken.isBlank())
                ? AwsSessionCredentials.create(accessKeyId, secretKey, sessionToken)
                : AwsBasicCredentials.create(accessKeyId, secretKey);

        StaticCredentialsProvider baseProvider = StaticCredentialsProvider.create(baseCredentials);

        // If a role ARN is set, auto-assume the role and auto-refresh
        if (roleArn != null && !roleArn.isBlank()) {
            StsClient stsClient = StsClient.builder()
                    .region(Region.of(region))
                    .credentialsProvider(baseProvider)
                    .build();
            return StsAssumeRoleCredentialsProvider.builder()
                    .stsClient(stsClient)
                    .refreshRequest(r -> r.roleArn(roleArn).roleSessionName("app-session"))
                    .build();
        }

        return baseProvider;
    }

    @Bean
    public S3Client s3Client(AwsCredentialsProvider awsCredentialsProvider,
                             @Value("${aws.region}") String awsRegion) {
        return S3Client.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(awsCredentialsProvider)
                .build();
    }

    @Bean
    public S3Presigner s3Presigner(AwsCredentialsProvider awsCredentialsProvider,
                                   @Value("${aws.region}") String awsRegion) {
        return S3Presigner.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(awsCredentialsProvider)
                .build();
    }
}
