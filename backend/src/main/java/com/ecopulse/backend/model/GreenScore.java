package com.ecopulse.backend.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "green_scores", indexes = {
        @Index(name = "idx_green_scores_user_time", columnList = "user_id,created_at")
})
public class GreenScore {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private int score;

    @Column(length = 512)
    private String reason;

    protected GreenScore() {}

    public GreenScore(User user, int score, String reason) {
        this.user = user;
        this.score = score;
        this.reason = reason;
    }

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public Instant getCreatedAt() { return createdAt; }
    public int getScore() { return score; }
    public String getReason() { return reason; }
}
