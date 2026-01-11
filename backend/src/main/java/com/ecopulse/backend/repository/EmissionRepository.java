package com.ecopulse.backend.repository;

import com.ecopulse.backend.model.EmissionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface EmissionRepository extends JpaRepository<EmissionLog, UUID> {
    Page<EmissionLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
}
