package com.ecopulse.backend.service.crypto;

import com.ecopulse.backend.config.BackendProperties;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class CryptoService {
    private static final String PREFIX = "v1:";
    private static final int GCM_TAG_BITS = 128;
    private static final int IV_BYTES = 12;

    private final BackendProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    private SecretKey key;
    private boolean enabled;

    public CryptoService(BackendProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void init() {
        var keyB64 = properties.encryption().fieldKeyB64();
        if (keyB64 == null || keyB64.isBlank()) {
            this.enabled = false;
            CryptoServiceLocator.set(this);
            return;
        }

        var raw = Base64.getDecoder().decode(keyB64);
        if (raw.length != 32) {
            throw new IllegalStateException("FIELD_ENCRYPTION_KEY_B64 must decode to 32 bytes for AES-256");
        }
        this.key = new SecretKeySpec(raw, "AES");
        this.enabled = true;
        CryptoServiceLocator.set(this);
    }

    public String encryptString(String plaintext) {
        if (!enabled || plaintext == null) return plaintext;
        try {
            var iv = new byte[IV_BYTES];
            secureRandom.nextBytes(iv);

            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
            var cipherBytes = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            return PREFIX + Base64.getEncoder().encodeToString(iv) + ":" + Base64.getEncoder().encodeToString(cipherBytes);
        } catch (Exception e) {
            throw new IllegalStateException("Encryption failed", e);
        }
    }

    public String decryptString(String ciphertext) {
        if (!enabled || ciphertext == null) return ciphertext;
        if (!ciphertext.startsWith(PREFIX)) {
            return ciphertext;
        }
        try {
            var rest = ciphertext.substring(PREFIX.length());
            var parts = rest.split(":", 2);
            if (parts.length != 2) return ciphertext;

            var iv = Base64.getDecoder().decode(parts[0]);
            var payload = Base64.getDecoder().decode(parts[1]);

            var cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_BITS, iv));
            var plain = cipher.doFinal(payload);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (Exception e) {
            // If key rotates or data is corrupted, return the raw value (keeps reads resilient).
            return ciphertext;
        }
    }
}
