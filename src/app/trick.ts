import { Card } from './components/card-pile/card-pile.component';

// One finished trick: who played each card, in order, and who won it
export interface Trick {
    plays: { player: number; card: Card }[];
    winner: number;
}
