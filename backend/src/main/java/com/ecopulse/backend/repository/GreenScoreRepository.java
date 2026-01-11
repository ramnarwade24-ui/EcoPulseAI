package com.ecopulse.backend.repository;

import com.ecopulse.backend.model.GreenScore;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GreenScoreRepository extends JpaRepository<GreenScore, UUID> {
    Page<GreenScore> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
}
