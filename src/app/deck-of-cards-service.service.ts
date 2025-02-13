import {Injectable} from '@angular/core';
import {Card} from './hand/hand.component';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DeckOfCardsServiceService {

  constructor(private http: HttpClient) {
  }

  getDeck(deckDefinition: string): Observable<object> {
    return this.http.get(`https://www.deckofcardsapi.com/api/deck/new/shuffle/?cards=${deckDefinition}`);
  }

  async drawCards(deckId: string, count: string): Promise<Card[]> {
    const resp = await fetch(`https://www.deckofcardsapi.com/api/deck/${deckId}/draw/?count=${count}`);
    const cardArr = await resp.json();
    return cardArr.cards;
  }

  async addToPile(deckId: string, pileName: string, cards: string): Promise<any> {
    const resp = await fetch(`https://www.deckofcardsapi.com/api/deck/${deckId}/pile/${pileName}/add/?cards=${cards}`);
    return await resp.json();
  }

  async listPile(deckId: string, pileName: string): Promise<any> {
    const resp = await fetch(`https://www.deckofcardsapi.com/api/deck/${deckId}/pile/${pileName}/list/`);
    return await resp.json();
  }

  async drawFromPile(deckId: string, pileName: string, code: string): Promise<any> {
    const resp = await fetch(`https://www.deckofcardsapi.com/api/deck/${deckId}/pile/${pileName}/draw/?cards=${code}`);
    return await resp.json();
  }
}
