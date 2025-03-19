import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {

    constructor() {
    }

    ngOnInit(): void {
    }

    goToWikiPage(): void {
        window.open('https://en.wikipedia.org/wiki/Mari%C3%A1%C5%A1', '_blank');
    }
}

