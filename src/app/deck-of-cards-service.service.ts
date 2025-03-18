import {Injectable} from '@angular/core';
import {Card} from './components/card-pile/card-pile.component';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DeckOfCardsServiceService {

  private readonly LOCAL_URL = 'http://127.0.0.1:8000';
  private readonly GLOBAL_URL = 'https://www.deckofcardsapi.com';
  private readonly BASE_URL: string;

  // Toggle this flag to change between using a locally hosted API or Global API
  private readonly LOCAL_MODE = true;

  constructor(private http: HttpClient) {
    if (this.LOCAL_MODE) {
      this.BASE_URL = this.LOCAL_URL;
    } else {
      this.BASE_URL = this.GLOBAL_URL;
    }
  }

  getDeck(deckDefinition: string): Observable<object> {
    return this.http.get(`${this.BASE_URL}/api/deck/new/shuffle/?cards=${deckDefinition}`);
  }

  async drawCards(deckId: string, count: string): Promise<Card[]> {
    const resp = await fetch(`${this.BASE_URL}/api/deck/${deckId}/draw/?count=${count}`);
    const cardArr = await resp.json();
    return cardArr.cards;
  }

  async addToPile(deckId: string, pileName: string, cards: string): Promise<any> {
    const resp = await fetch(`${this.BASE_URL}/api/deck/${deckId}/pile/${pileName}/add/?cards=${cards}`);
    return await resp.json();
  }

  async listPile(deckId: string, pileName: string): Promise<any> {
    const resp = await fetch(`${this.BASE_URL}/api/deck/${deckId}/pile/${pileName}/list/`);
    return await resp.json();
  }

  async drawFromPile(deckId: string, pileName: string, code: string): Promise<any> {
    const resp = await fetch(`${this.BASE_URL}/api/deck/${deckId}/pile/${pileName}/draw/?cards=${code}`);
    return await resp.json();
  }
}
