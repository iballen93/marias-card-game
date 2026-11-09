import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open the New Game menu with Standard greyed out', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.new-game-menu')).toBeNull();

    (element.querySelector('.menu-toggle') as HTMLElement).click();
    fixture.detectChanges();
    const options = Array.from(element.querySelectorAll('.new-game-menu > *')).map(option => option.textContent.trim());
    expect(options).toEqual(['New Game (Learning Mode Solo)', 'New Game (Learning Mode vs PC) Slow',
      'New Game (Learning Mode vs PC) Fast', 'New Game (Standard) Coming soon']);
    expect(element.querySelector('.menu-disabled').getAttribute('aria-disabled')).toEqual('true');
  });

  it('should close the New Game menu on a click outside it or Escape', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.toggleNewGameMenu();
    document.body.click();
    expect(app.isNewGameMenuOpen).toBeFalse();

    app.toggleNewGameMenu();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(app.isNewGameMenuOpen).toBeFalse();
  });
});
