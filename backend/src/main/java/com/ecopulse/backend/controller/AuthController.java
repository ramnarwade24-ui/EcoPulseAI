package com.ecopulse.backend.controller;

import com.ecopulse.backend.model.User;
import com.ecopulse.backend.repository.UserRepository;
import com.ecopulse.backend.service.auth.AuthService;
import com.ecopulse.backend.service.security.SecurityUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final UserRepository userRepository;

    public AuthController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        var user = authService.register(request.email(), request.password(), request.fullName());
        var login = authService.login(request.email(), request.password());
        return AuthResponse.from(login.user(), login.accessToken());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        var login = authService.login(request.email(), request.password());
        return AuthResponse.from(login.user(), login.accessToken());
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal Object principal) {
        if (principal instanceof SecurityUserDetails details) {
            var user = userRepository.findById(details.id()).orElseThrow();
            return MeResponse.from(user);
        }
        throw new IllegalStateException("Not authenticated");
    }

    public record RegisterRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8, max = 100) String password,
            @Size(max = 120) String fullName
    ) {}

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {}

    public record AuthResponse(String accessToken, UserView user) {
        static AuthResponse from(User user, String token) {
            return new AuthResponse(token, UserView.from(user));
        }
    }

    public record MeResponse(UserView user) {
        static MeResponse from(User user) {
            return new MeResponse(UserView.from(user));
        }
    }

    public record UserView(String id, String email, String role, String fullName) {
        static UserView from(User user) {
            return new UserView(
                    user.getId().toString(),
                    user.getEmail(),
                    user.getRole().name(),
                    user.getFullName()
            );
        }
    }
}
