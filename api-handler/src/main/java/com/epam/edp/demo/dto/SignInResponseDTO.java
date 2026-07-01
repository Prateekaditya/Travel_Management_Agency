package com.epam.edp.demo.dto;

import com.epam.edp.demo.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignInResponseDTO {

    private String idToken;
    private String refreshToken;
    private Role role;
    private String userName;
    private String email;
    private String userId;
}
