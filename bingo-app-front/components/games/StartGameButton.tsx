import { ActionButton } from '@/components/ui/Surface';

const MIN_PLAYERS = 2;

interface StartGameButtonProps {
  onStart: () => void;
  registeredPlayers?: number;
  starting?: boolean;
  busy?: boolean;
  countdownSeconds?: number | null;
}

export function StartGameButton({
  onStart,
  registeredPlayers,
  starting,
  busy,
  countdownSeconds,
}: StartGameButtonProps) {
  const needsPlayers = registeredPlayers != null && registeredPlayers < MIN_PLAYERS;
  return (
    <ActionButton
      variant="success"
      onClick={onStart}
      disabled={needsPlayers || starting || busy}
    >
      {needsPlayers
        ? `Need ${MIN_PLAYERS} players (${registeredPlayers})`
        : starting && countdownSeconds != null
          ? `Starting in ${countdownSeconds}s…`
          : busy
            ? 'Starting…'
            : 'Start'}
    </ActionButton>
  );
}