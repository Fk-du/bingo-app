package com.bingo.app.tenant.repository;

import com.bingo.app.tenant.entity.Card;
import com.bingo.app.tenant.enums.GameStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {

    Optional<Card> findByNumbersHash(String numbersHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Card c WHERE c.id = :id")
    Optional<Card> findByIdForUpdate(@Param("id") Long id);

    /**
     * Cards currently free within this tenant: not dealt to any live game
     * (REGISTRATION_OPEN / STARTING / IN_PROGRESS / PAUSED / CLAIM_PENDING).
     * Ordered by card number (id) so pages read naturally, cheapest first.
     */
    @Query("""
            SELECT c FROM Card c
            WHERE NOT EXISTS (
                SELECT 1 FROM GameCard gc
                WHERE gc.card = c
                  AND gc.gameId IN (SELECT g.id FROM Game g WHERE g.status IN :statuses)
            )
            ORDER BY c.id ASC
            """)
    List<Card> findAvailable(@Param("statuses") Collection<GameStatus> statuses, Pageable pageable);

    @Query("""
            SELECT COUNT(c) FROM Card c
            WHERE NOT EXISTS (
                SELECT 1 FROM GameCard gc
                WHERE gc.card = c
                  AND gc.gameId IN (SELECT g.id FROM Game g WHERE g.status IN :statuses)
            )
            """)
    long countAvailable(@Param("statuses") Collection<GameStatus> statuses);

    /**
     * True when a card is currently dealt to a live game (i.e. occupied by a player).
     */
    @Query("""
            SELECT COUNT(gc) > 0 FROM GameCard gc
            WHERE gc.card.id = :cardId
              AND gc.gameId IN (SELECT g.id FROM Game g WHERE g.status IN :statuses)
            """)
    boolean isCardOccupied(@Param("cardId") Long cardId, @Param("statuses") Collection<GameStatus> statuses);

    @Query("SELECT AVG(c.winRate) FROM Card c")
    Double getAverageWinRate();
}