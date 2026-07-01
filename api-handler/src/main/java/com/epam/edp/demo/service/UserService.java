package com.epam.edp.demo.service;

import com.epam.edp.demo.dto.ChangeEmailRequestDTO;
import com.epam.edp.demo.dto.ChangeEmailResponseDTO;
import com.epam.edp.demo.dto.ConfirmEmailRequestDTO;
import com.epam.edp.demo.dto.ConfirmEmailResponseDTO;
import com.epam.edp.demo.dto.UpdateNameResponseDTO;
import com.epam.edp.demo.dto.UpdatePasswordRequestDTO;
import com.epam.edp.demo.dto.UpdatePasswordResponseDTO;
import com.epam.edp.demo.dto.UpdateUserNameRequestDTO;
import com.epam.edp.demo.dto.UserDTO;

public interface UserService {
    UserDTO getUserById(String id);
    UpdateNameResponseDTO updateName(String id, UpdateUserNameRequestDTO req);
    UpdatePasswordResponseDTO updatePassword(String id, UpdatePasswordRequestDTO req);
    ChangeEmailResponseDTO initiateEmailChange(String id, ChangeEmailRequestDTO req);
    ConfirmEmailResponseDTO confirmEmailChange(String id, ConfirmEmailRequestDTO req);
}
