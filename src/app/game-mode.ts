// Which kind of game is being played, chosen from the New Game menu
// learning-pc is vs PC Fast; learning-pc-slow waits for you to click Next after each PC move
export type GameMode = 'learning-solo' | 'learning-pc' | 'learning-pc-slow' | 'standard';

export const isVsPc = (mode: GameMode): boolean => mode === 'learning-pc' || mode === 'learning-pc-slow';

export const DEFAULT_GAME_MODE: GameMode = 'learning-solo';
