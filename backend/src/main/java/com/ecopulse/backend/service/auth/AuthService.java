package com.ecopulse.backend.service.auth;

import com.ecopulse.backend.model.Role;
import com.ecopulse.backend.model.User;
import com.ecopulse.backend.repository.UserRepository;
import com.ecopulse.backend.service.cache.RoleCacheService;
import com.ecopulse.backend.service.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RoleCacheService roleCacheService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService, RoleCacheService roleCacheService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.roleCacheService = roleCacheService;
    }

    public User register(String email, String password, String fullName) {
        var normalized = email.trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalized)) {
            throw new IllegalArgumentException("Email already registered");
        }

        var user = new User(normalized, passwordEncoder.encode(password), Role.USER, fullName);
        var saved = userRepository.save(user);
        roleCacheService.putRole(saved.getId(), saved.getRole());
        return saved;
    }

    public AuthResult login(String email, String password) {
        var user = userRepository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        roleCacheService.putRole(user.getId(), user.getRole());
        var token = jwtService.issueAccessToken(user.getEmail(), Map.of(
                "uid", user.getId().toString(),
                "role", user.getRole().name()
        ));
        return new AuthResult(token, user);
    }

    public record AuthResult(String accessToken, User user) {}
}
