package com.nazir.taskmanagement.service;

import com.nazir.taskmanagement.dto.request.LoginRequest;
import com.nazir.taskmanagement.dto.request.RegisterRequest;
import com.nazir.taskmanagement.dto.response.AuthResponse;
import com.nazir.taskmanagement.dto.response.UserResponse;
import com.nazir.taskmanagement.entity.User;
import com.nazir.taskmanagement.entity.enums.Role;
import com.nazir.taskmanagement.exception.BadRequestException;
import com.nazir.taskmanagement.exception.DuplicateResourceException;
import com.nazir.taskmanagement.repository.UserRepository;
import com.nazir.taskmanagement.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username '" + request.getUsername() + "' is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email '" + request.getEmail() + "' is already registered");
        }

        User user = User.builder()
            .username(request.getUsername().toLowerCase())
            .email(request.getEmail().toLowerCase())
            .password(passwordEncoder.encode(request.getPassword()))
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .role(Role.ROLE_USER)
            .enabled(true)
            .build();

        user = userRepository.save(user);
        log.info("New user registered: {}", user.getUsername());

        String token = jwtUtil.generateToken(user.getUsername());
        return buildAuthResponse(token, user);
    }

    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getUsernameOrEmail().toLowerCase(),
                    request.getPassword()
                )
            );

            String username = authentication.getName();
            User user = userRepository.findByUsernameOrEmail(username)
                .orElseThrow(() -> new BadRequestException("User not found"));

            String token = jwtUtil.generateToken(user.getUsername());
            log.info("User logged in: {}", user.getUsername());
            return buildAuthResponse(token, user);

        } catch (DisabledException e) {
            throw new BadRequestException("Account is disabled. Please contact support.");
        } catch (BadCredentialsException e) {
            throw new BadRequestException("Invalid username/email or password");
        }
    }

    public UserResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new BadRequestException("User not found"));
        return UserResponse.from(user);
    }

    private AuthResponse buildAuthResponse(String token, User user) {
        return AuthResponse.builder()
            .accessToken(token)
            .tokenType("Bearer")
            .expiresIn(jwtUtil.getExpiration())
            .user(UserResponse.from(user))
            .build();
    }
}
