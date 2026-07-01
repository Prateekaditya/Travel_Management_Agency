package com.epam.edp.demo.controller;

import com.epam.edp.demo.dto.ChangeEmailRequestDTO;
import com.epam.edp.demo.dto.ChangeEmailResponseDTO;
import com.epam.edp.demo.dto.ConfirmEmailRequestDTO;
import com.epam.edp.demo.dto.ConfirmEmailResponseDTO;
import com.epam.edp.demo.dto.UpdateNameResponseDTO;
import com.epam.edp.demo.dto.UpdatePasswordRequestDTO;
import com.epam.edp.demo.dto.UpdatePasswordResponseDTO;
import com.epam.edp.demo.dto.UpdateUserNameRequestDTO;
import com.epam.edp.demo.dto.UserDTO;
import com.epam.edp.demo.exception.UnauthorizedException;
import com.epam.edp.demo.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUser(@PathVariable String id) {
        validateOwnership(id);
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PutMapping("/{id}/name")
    public ResponseEntity<UpdateNameResponseDTO> updateName(
            @PathVariable String id,
            @Valid @RequestBody UpdateUserNameRequestDTO request) {
        validateOwnership(id);
        return ResponseEntity.ok(userService.updateName(id, request));
    }

    private void validateOwnership(String pathId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new UnauthorizedException("Authentication required. Please log in or sign up.");
        }
        if (!auth.getName().equals(pathId)) {
            throw new UnauthorizedException("Access denied.");
        }
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<UpdatePasswordResponseDTO> updatePassword(
            @PathVariable String id,
            @Valid @RequestBody UpdatePasswordRequestDTO request) {
        validateOwnership(id);
        return ResponseEntity.ok(userService.updatePassword(id, request));
    }

    @PutMapping("/{id}/email")
    public ResponseEntity<ChangeEmailResponseDTO> initiateEmailChange(
            @PathVariable String id,
            @Valid @RequestBody ChangeEmailRequestDTO request) {
        validateOwnership(id);
        return ResponseEntity.ok(userService.initiateEmailChange(id, request));
    }

    @PostMapping("/{id}/email/confirm")
    public ResponseEntity<ConfirmEmailResponseDTO> confirmEmailChange(
            @PathVariable String id,
            @Valid @RequestBody ConfirmEmailRequestDTO request) {
        validateOwnership(id);
        return ResponseEntity.ok(userService.confirmEmailChange(id, request));
    }
}
