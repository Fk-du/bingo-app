package com.bingo.app.tenant.dto.request;

/**
 * Optional body for game registration. When {@code cardId} is null the server
 * auto-picks the first free card in the agent's pool.
 */
public record RegisterRequest(
        Long cardId
) {}