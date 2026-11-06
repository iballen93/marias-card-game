import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { PointsComponent } from './points/points.component';
import { CardPileComponent } from './components/card-pile/card-pile.component';
import { TurnInfoComponent } from './components/turn-info/turn-info.component';
import { HandComponent } from 'src/app/components/hand/hand.component';
import { RouterModule } from '@angular/router';
import { GameComponent } from 'src/app/components/game/game.component';
import { AppRoutingModule } from 'src/app/app-routing.module';
import { HowToPlayComponent } from 'src/app/components/how-to-play/how-to-play.component';
import { GameValuesComponent } from 'src/app/components/game-values/game-values.component';

@NgModule({
  declarations: [
    AppComponent,
    CardPileComponent,
    GameComponent,
    GameValuesComponent,
    HowToPlayComponent,
    HandComponent,
    TurnInfoComponent,
    PointsComponent
  ],
  imports: [
    AppRoutingModule, BrowserModule, RouterModule.forRoot([]),
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
