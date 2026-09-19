package com.bingo.app.tenant.service;

import com.bingo.app.infrastructure.persistence.TenantContext;
import com.bingo.app.master.entity.TenantRegistry;
import com.bingo.app.master.repository.TenantRegistryRepository;
import com.bingo.app.tenant.dto.AutomationConfigRequest;
import com.bingo.app.tenant.dto.CreateGameRequest;
import com.bingo.app.tenant.dto.response.AutomationConfigResponse;
import com.bingo.app.tenant.entity.AutomationConfig;
import com.bingo.app.tenant.entity.Game;
import com.bingo.app.tenant.entity.GameCard;
import com.bingo.app.tenant.enums.GameStatus;
import com.bingo.app.tenant.exception.GameProgressException;
import com.bingo.app.tenant.repository.AutomationConfigRepository;
import com.bingo.app.tenant.repository.GameCardRepository;
import com.bingo.app.tenant.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Automatic game mode. Once an admin enables automation with a saved template,
 * this service keeps the loop running: it creates a new game (registration open)
 * after the previous one ends (respecting a cooldown), then starts it
 * automatically once the registration window elapses (or the table fills up),
 * provided the usual rules hold (2+ players, game owned by the admin, etc.).
 * Everything downstream — entry fees, prize pool, fair-play commit, calling,
 * claims, commissions — is exactly the same as a manually run game.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class GameAutomationService {

    private final AutomationConfigRepository automationConfigRepository;
    private final GameRepository gameRepository;
    private final GameCardRepository gameCardRepository;
    private final GameService gameService;
    private final GameEngineService gameEngineService;
    private final TenantRegistryRepository tenantRegistryRepository;

    @Qualifier("tenantTransactionTemplate")
    private final TransactionTemplate transactionTemplate;

    @Value("${bingo.automation.stale-registration-minutes:30}")
    private int staleRegistrationMinutes;

    private static final int START_COUNTDOWN_SECONDS = 5;
    private static final int MIN_PLAYERS_TO_START = 2;
    private static final int DEFAULT_REGISTRATION_WINDOW_SECONDS = 180;
    private static final Set<String> SUPPORTED_PATTERNS = Set.of(
            "SINGLE_LINE", "DOUBLE_LINE", "TRIPLE_LINE", "FULL_HOUSE", "BLACKOUT", "FOUR_CORNERS",
            "X_SHAPE", "L_SHAPE", "T_SHAPE", "POSTAGE_STAMP",
            "PLUS", "FRAME", "DIAMOND", "Z_SHAPE");

    public AutomationConfigResponse getConfig(Long adminUserId) {
        return automationConfigRepository.findByAdminUserId(adminUserId)
                .map(this::toDto)
                .orElseGet(() -> defaultResponse(adminUserId));
    }

    public AutomationConfigResponse saveConfig(Long adminUserId, AutomationConfigRequest request) {
        AutomationConfig config = automationConfigRepository.findByAdminUserId(adminUserId)
                .orElseGet(() -> AutomationConfig.builder()
                        .adminUserId(adminUserId)
                        .build());

        config.setEntryFee(request.getEntryFee() != null ? request.getEntryFee() : BigDecimal.TEN);
        config.setMaxPlayers(request.getMaxPlayers() != null ? request.getMaxPlayers() : 50);
        config.setCallInterval(request.getCallInterval() != null ? request.getCallInterval() : 5);
        config.setCommissionPercent(request.getCommissionPercent() != null
                ? request.getCommissionPercent() : new BigDecimal("10.00"));
        config.setAutoMark(request.getAutoMark() == null || request.getAutoMark());
        config.setRegistrationWindowSeconds(request.getRegistrationWindowSeconds() != null
                ? request.getRegistrationWindowSeconds() : DEFAULT_REGISTRATION_WINDOW_SECONDS);
        config.setCooldownSeconds(request.getCooldownSeconds() != null
                ? request.getCooldownSeconds() : 15);
        config.setStartWhenFull(request.getStartWhenFull() == null || request.getStartWhenFull());
        config.setEnabled(Boolean.TRUE.equals(request.getEnabled()));

        String pattern = normalizePattern(request);
        config.setWinningPattern(pattern);
        if ("CUSTOM".equals(pattern)) {
            config.setCustomPatternName(request.getCustomPatternName());
            config.setCustomPatternCells(request.getCustomPatternCells());
        } else {
            config.setCustomPatternName(null);
            config.setCustomPatternCells(null);
        }

        // Enabling (or saving while enabled) schedules the next game immediately so the
        // scanner creates one on its very next tick instead of waiting on a stale cooldown.
        boolean wasEnabled = Boolean.TRUE.equals(config.getEnabled());
        if (wasEnabled && (config.getNextGameAt() == null || config.getNextGameAt().isBefore(LocalDateTime.now()))) {
            config.setNextGameAt(LocalDateTime.now());
        }

        config.setUpdatedAt(LocalDateTime.now());
        return toDto(automationConfigRepository.save(config));
    }

    public AutomationConfigResponse setEnabled(Long adminUserId, boolean enabled) {
        AutomationConfig config = automationConfigRepository.findByAdminUserId(adminUserId)
                .orElseThrow(() -> new GameProgressException("No automation config",
                        "Save an automation template first."));
        config.setEnabled(enabled);
        if (enabled) {
            config.setNextGameAt(LocalDateTime.now());
        }
        config.setUpdatedAt(LocalDateTime.now());
        return toDto(automationConfigRepository.save(config));
    }

    /**
     * Scans every tenant for automation work: create a game, start a ready one,
     * clean up stale registration-only tables. Runs sequentially, once every 10s.
     */
    @Scheduled(fixedDelay = 10_000)
    public void runAutomation() {
        List<TenantRegistry> tenants;
        try {
            tenants = tenantRegistryRepository.findAll();
        } catch (Exception e) {
            log.warn("Could not load tenant registry for automation: {}", e.getMessage());
            return;
        }

        for (TenantRegistry tenant : tenants) {
            Long adminUserId = tenant.getAdminUserId();
            String tenantId = TenantContext.tenantKeyForAdmin(adminUserId);
            try {
                TenantContext.setTenant(tenantId);
                transactionTemplate.executeWithoutResult(status -> processTenant(adminUserId));
            } catch (Exception e) {
                log.error("Automation failed for tenant {}: {}", tenantId, e.getMessage(), e);
            } finally {
                TenantContext.clear();
            }
        }
    }

    private void processTenant(Long adminUserId) {
        AutomationConfig config = automationConfigRepository.findByAdminUserIdForUpdate(adminUserId).orElse(null);
        if (config == null || !Boolean.TRUE.equals(config.getEnabled())) {
            return;
        }

        List<Game> live = gameRepository.findAllByAdminUserIdAndStatusIn(adminUserId,
                List.of(GameStatus.REGISTRATION_OPEN, GameStatus.STARTING, GameStatus.IN_PROGRESS,
                        GameStatus.PAUSED, GameStatus.CLAIM_PENDING));

        Game openRegistration = live.stream()
                .filter(g -> g.getStatus() == GameStatus.REGISTRATION_OPEN)
                .findFirst()
                .orElse(null);

        if (openRegistration != null) {
            handleOpenRegistration(adminUserId, config, openRegistration);
            return;
        }

        // A game is running (starting / in progress / paused / claims pending) — wait.
        if (!live.isEmpty()) {
            return;
        }

        LocalDateTime nextGameAt = config.getNextGameAt();
        if (nextGameAt != null && nextGameAt.isAfter(LocalDateTime.now())) {
            return;
        }

        createAutomatedGame(adminUserId, config);
    }

    private void handleOpenRegistration(Long adminUserId, AutomationConfig config, Game game) {
        long playerCount = gameCardRepository.countDistinctPlayersByGameId(game.getId());

        // Clean up tables that never collected enough players so the loop keeps moving.
        if (playerCount < 2 && game.getCreatedAt() != null
                && game.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(staleRegistrationMinutes))) {
            try {
                gameService.cancelGame(game.getId(), adminUserId);
            } catch (GameProgressException e) {
                log.warn("Automation could not cancel stale game {}: {}", game.getId(), e.getMessage());
                return;
            }
            config.setNextGameAt(LocalDateTime.now());
            config.setUpdatedAt(LocalDateTime.now());
            automationConfigRepository.save(config);
            log.info("Automation: cancelled stale registration game {} ({} player) for admin {}",
                    game.getId(), playerCount, adminUserId);
            return;
        }

        int maxPlayers = config.getMaxPlayers() != null ? config.getMaxPlayers() : 50;
        boolean full = Boolean.TRUE.equals(config.getStartWhenFull()) && playerCount >= maxPlayers;

        // A game must have at least MIN_PLAYERS_TO_START registered players before we start it,
        // no matter how the start was triggered (filled table or registration window elapsed).
        boolean enoughPlayers = playerCount >= MIN_PLAYERS_TO_START;

        int window = config.getRegistrationWindowSeconds() != null
                ? config.getRegistrationWindowSeconds() : DEFAULT_REGISTRATION_WINDOW_SECONDS;
        boolean windowElapsed = game.getCreatedAt() != null
                && game.getCreatedAt().plusSeconds(window).isBefore(LocalDateTime.now());

        // The game opens for registration as soon as the previous one finishes, and waits for the
        // registration window to elapse (or the table to fill) before starting — giving players a
        // few minutes to join. Not enough players? Keep the table open and try again next tick.
        if (enoughPlayers && (full || windowElapsed)) {
            try {
                gameService.startGameForAdmin(adminUserId, game.getId());
                gameEngineService.scheduleGameStart(game.getId(), START_COUNTDOWN_SECONDS);
                log.info("Automation: started game {} for admin {} ({} players, {} secs open)",
                        game.getId(), adminUserId, playerCount, Duration.between(game.getCreatedAt(), LocalDateTime.now()).getSeconds());
            } catch (GameProgressException e) {
                log.warn("Automation could not start game {}: {}", game.getId(), e.getMessage());
            }
        } else {
            log.info("Automation: game {} for admin {} waits for players (" +
                            "registered={}, window={}s elapsed={}, full={})",
                    game.getId(), adminUserId, playerCount, window, windowElapsed, full);
        }
    }

    private void createAutomatedGame(Long adminUserId, AutomationConfig config) {
        CreateGameRequest request = CreateGameRequest.builder()
                .entryFee(config.getEntryFee() != null ? config.getEntryFee() : BigDecimal.TEN)
                .maxPlayers(config.getMaxPlayers() != null ? config.getMaxPlayers() : 50)
                .callInterval(config.getCallInterval() != null ? config.getCallInterval() : 5)
                .commissionPercent(config.getCommissionPercent() != null
                        ? config.getCommissionPercent() : new BigDecimal("10.00"))
                .autoMark(config.getAutoMark() == null || config.getAutoMark())
                .winningPattern(config.getWinningPattern() != null ? config.getWinningPattern() : "SINGLE_LINE")
                .build();

        if ("CUSTOM".equals(config.getWinningPattern())) {
            request.setCustomPatternName(config.getCustomPatternName());
            request.setCustomPatternCells(config.getCustomPatternCells());
        }

        gameService.createGameWithEntryFee(adminUserId, request);

        int cooldown = config.getCooldownSeconds() != null ? config.getCooldownSeconds() : 15;
        config.setNextGameAt(LocalDateTime.now().plusSeconds(cooldown));
        config.setUpdatedAt(LocalDateTime.now());
        automationConfigRepository.save(config);

        log.info("Automation: created automatic game for admin {} (entryFee {}, next cooldown {}s)",
                adminUserId, request.getEntryFee(), cooldown);
    }

    private String normalizePattern(AutomationConfigRequest request) {
        String pattern = request.getWinningPattern() != null ? request.getWinningPattern() : "SINGLE_LINE";
        if ("CUSTOM".equals(pattern)) {
            if (request.getCustomPatternName() == null || request.getCustomPatternName().trim().isEmpty()) {
                throw new GameProgressException("Custom pattern requires a name",
                        "Give your custom pattern a name.");
            }
            if (request.getCustomPatternCells() == null || request.getCustomPatternCells().trim().isEmpty()) {
                throw new GameProgressException("Custom pattern requires cells",
                        "Draw a pattern on the board first.");
            }
            return "CUSTOM";
        }
        if ("BLACKOUT".equals(pattern)) {
            return "FULL_HOUSE";
        }
        if (!SUPPORTED_PATTERNS.contains(pattern)) {
            throw new GameProgressException("Unsupported winning pattern: " + pattern,
                    "Unknown winning pattern. Pick one from the list.");
        }
        return pattern;
    }

    private AutomationConfigResponse toDto(AutomationConfig config) {
        return AutomationConfigResponse.builder()
                .adminUserId(config.getAdminUserId())
                .enabled(Boolean.TRUE.equals(config.getEnabled()))
                .entryFee(config.getEntryFee())
                .maxPlayers(config.getMaxPlayers())
                .callInterval(config.getCallInterval())
                .commissionPercent(config.getCommissionPercent())
                .winningPattern(config.getWinningPattern())
                .customPatternName(config.getCustomPatternName())
                .customPatternCells(config.getCustomPatternCells())
                .autoMark(config.getAutoMark() == null || config.getAutoMark())
                .registrationWindowSeconds(config.getRegistrationWindowSeconds())
                .cooldownSeconds(config.getCooldownSeconds())
                .startWhenFull(config.getStartWhenFull() == null || config.getStartWhenFull())
                .nextGameAt(config.getNextGameAt())
                .updatedAt(config.getUpdatedAt())
                .build();
    }

    private AutomationConfigResponse defaultResponse(Long adminUserId) {
        return AutomationConfigResponse.builder()
                .adminUserId(adminUserId)
                .enabled(false)
                .entryFee(BigDecimal.TEN)
                .maxPlayers(50)
                .callInterval(5)
                .commissionPercent(new BigDecimal("10.00"))
                .winningPattern("SINGLE_LINE")
                .autoMark(true)
                .registrationWindowSeconds(DEFAULT_REGISTRATION_WINDOW_SECONDS)
                .cooldownSeconds(15)
                .startWhenFull(true)
                .build();
    }
}