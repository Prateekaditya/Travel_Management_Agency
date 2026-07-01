package com.epam.edp.demo;

import com.epam.edp.demo.repository.BookingRepository;
import com.epam.edp.demo.repository.EmailChangeTokenRepository;
import com.epam.edp.demo.repository.PasswordResetTokenRepository;
import com.epam.edp.demo.repository.RefreshTokenRepository;
import com.epam.edp.demo.repository.TourRepository;
import com.epam.edp.demo.repository.TravelAgentRepository;
import com.epam.edp.demo.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.ses.SesClient;

@SpringBootTest(properties = "spring.main.allow-bean-definition-overriding=true")
@ActiveProfiles("test")
public class DemoApplicationTests {

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private TourRepository tourRepository;

    @MockitoBean
    private TravelAgentRepository travelAgentRepository;

    @MockitoBean
    private BookingRepository bookingRepository;

    @MockitoBean
    private RefreshTokenRepository refreshTokenRepository;

    @MockitoBean
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @MockitoBean
    private EmailChangeTokenRepository emailChangeTokenRepository;

    @MockitoBean
    private AwsCredentialsProvider awsCredentialsProvider;

    @MockitoBean
    private S3Client s3Client;

    @MockitoBean
    private S3Presigner s3Presigner;

    @MockitoBean
    private SesClient sesClient;

    @MockitoBean
    private MongoTemplate mongoTemplate;

    @MockitoBean
    private ConnectionFactory connectionFactory;

    @Test
    void contextLoads() {
    }
}
