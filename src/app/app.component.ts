import { Component, ElementRef, HostListener, OnInit } from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {

    isNewGameMenuOpen = false;

    constructor(private elementRef: ElementRef<HTMLElement>) {
    }

    ngOnInit(): void {
    }

    goToWikiPage(): void {
        window.open('https://en.wikipedia.org/wiki/Mari%C3%A1%C5%A1', '_blank');
    }

    toggleNewGameMenu(): void {
        this.isNewGameMenuOpen = !this.isNewGameMenuOpen;
    }

    closeNewGameMenu(): void {
        this.isNewGameMenuOpen = false;
    }

    // A click anywhere outside the New Game menu closes it
    @HostListener('document:click', ['$event.target'])
    onDocumentClick(target: Node): void {
        const newGame = this.elementRef.nativeElement.querySelector('.new-game');
        if (this.isNewGameMenuOpen && !newGame?.contains(target)) {
            this.closeNewGameMenu();
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        this.closeNewGameMenu();
    }
}
