import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import {HttpClient, HttpHandler} from '@angular/common/http';

describe('AppComponent', () => {
  let service: AppComponent;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        AppComponent
      ],
      providers: [AppComponent, HttpClient, HttpHandler],
    }).compileComponents();
    service = TestBed.inject(AppComponent);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'marias'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('marias');
  });

/*  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.content span').textContent).toContain('marias app is running!');
  });*/

  it('should determine the winning player for card 1 when activePlayer is 1', () => {
    service.activePlayer = 1;
    expect(service.determineRoundWinningPlayer(1)).toEqual(1);
  });

  it('should determine the winning player for card 2 when activePlayer is 1', () => {
    service.activePlayer = 1;
    expect(service.determineRoundWinningPlayer(2)).toEqual(2);
  });

  it('should determine the winning player for card 3 when activePlayer is 1', () => {
    service.activePlayer = 1;
    expect(service.determineRoundWinningPlayer(3)).toEqual(3);
  });

  it('should determine the winning player for card 1 when activePlayer is 2', () => {
    service.activePlayer = 2;
    expect(service.determineRoundWinningPlayer(1)).toEqual(2);
  });

  it('should determine the winning player for card 2 when activePlayer is 2', () => {
    service.activePlayer = 2;
    expect(service.determineRoundWinningPlayer(2)).toEqual(3);
  });

  it('should determine the winning player for card 3 when activePlayer is 2', () => {
    service.activePlayer = 2;
    expect(service.determineRoundWinningPlayer(3)).toEqual(1);
  });

  it('should determine the winning player for card 1 when activePlayer is 3', () => {
    service.activePlayer = 3;
    expect(service.determineRoundWinningPlayer(1)).toEqual(3);
  });

  it('should determine the winning player for card 2 when activePlayer is 3', () => {
    service.activePlayer = 3;
    expect(service.determineRoundWinningPlayer(2)).toEqual(1);
  });

  it('should determine the winning player for card 3 when activePlayer is 3', () => {
    service.activePlayer = 3;
    expect(service.determineRoundWinningPlayer(3)).toEqual(2);
  });

});
