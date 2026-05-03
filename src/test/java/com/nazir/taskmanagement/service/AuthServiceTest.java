package com.nazir.taskmanagement.service;

import com.nazir.taskmanagement.dto.request.RegisterRequest;
import com.nazir.taskmanagement.dto.response.AuthResponse;
import com.nazir.taskmanagement.entity.User;
import com.nazir.taskmanagement.entity.enums.Role;
import com.nazir.taskmanagement.exception.DuplicateResourceException;
import com.nazir.taskmanagement.repository.UserRepository;
import com.nazir.taskmanagement.security.JwtUtil;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtUtil jwtUtil;
    @Mock AuthenticationManager authenticationManager;

    @InjectMocks AuthService authService;

    @Test
    @DisplayName("register — new user is saved and JWT returned")
    void register_newUser_succeeds() {
        RegisterRequest req = new RegisterRequest("nazir", "nazir@test.com", "Password@1", "Nazir", "Dev");

        when(userRepository.existsByUsername("nazir")).thenReturn(false);
        when(userRepository.existsByEmail("nazir@test.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded_pass");
        when(jwtUtil.generateToken(anyString())).thenReturn("jwt_token");
        when(jwtUtil.getExpiration()).thenReturn(86400000L);

        User savedUser = User.builder().id(1L).username("nazir").email("nazir@test.com")
                .password("encoded_pass").firstName("Nazir").lastName("Dev")
                .role(Role.ROLE_USER).enabled(true).build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        AuthResponse resp = authService.register(req);

        assertThat(resp.getAccessToken()).isEqualTo("jwt_token");
        assertThat(resp.getUser().getUsername()).isEqualTo("nazir");
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("register — duplicate username throws DuplicateResourceException")
    void register_duplicateUsername_throws() {
        RegisterRequest req = new RegisterRequest("admin", "new@test.com", "Password@1", null, null);

        when(userRepository.existsByUsername("admin")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("admin");
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("register — duplicate email throws DuplicateResourceException")
    void register_duplicateEmail_throws() {
        RegisterRequest req = new RegisterRequest("newuser", "admin@taskmanager.com", "Password@1", null, null);

        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("admin@taskmanager.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("admin@taskmanager.com");
    }
}
