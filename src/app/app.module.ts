import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ServiceWorkerModule } from '@angular/service-worker';

import { AppComponent } from './app.component';
import { PointsComponent } from './points/points.component';
import { CardPileComponent } from './components/card-pile/card-pile.component';
import { TurnInfoComponent } from './components/turn-info/turn-info.component';
import { BidDialogComponent } from './components/bid-dialog/bid-dialog.component';
import { RaiseDialogComponent } from './components/raise-dialog/raise-dialog.component';
import { TakeOverDialogComponent } from './components/take-over-dialog/take-over-dialog.component';
import { HandComponent } from 'src/app/components/hand/hand.component';
import { GameComponent } from 'src/app/components/game/game.component';
import { AppRoutingModule } from 'src/app/app-routing.module';
import { HowToPlayComponent } from 'src/app/components/how-to-play/how-to-play.component';
import { GameValuesComponent } from 'src/app/components/game-values/game-values.component';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    BidDialogComponent,
    RaiseDialogComponent,
    TakeOverDialogComponent,
    CardPileComponent,
    GameComponent,
    GameValuesComponent,
    HowToPlayComponent,
    HandComponent,
    TurnInfoComponent,
    PointsComponent
  ],
  imports: [
    AppRoutingModule, BrowserModule,
    // only the GitHub Pages web app saves itself for offline play (see HOW-TO-INSTALL-ON-IPAD.md)
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.serviceWorker, registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
