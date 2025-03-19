import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { PointsComponent } from './points/points.component';
import { CardPileComponent } from './components/card-pile/card-pile.component';
import { TurnInfoComponent } from './components/turn-info/turn-info.component';
import { HandComponent } from 'src/app/components/hand/hand.component';
import { RouterModule } from '@angular/router';
import { GameComponent } from 'src/app/components/game/game.component';
import { AppRoutingModule } from 'src/app/app-routing.module';
import { HowToPlayComponent } from 'src/app/components/how-to-play/how-to-play.component';

@NgModule({
  declarations: [
    AppComponent,
    CardPileComponent,
    GameComponent,
    HowToPlayComponent,
    HandComponent,
    TurnInfoComponent,
    PointsComponent
  ],
  imports: [
    AppRoutingModule, BrowserModule, HttpClientModule, RouterModule.forRoot([]),
  ],
  providers: [HttpClientModule],
  bootstrap: [AppComponent]
})
export class AppModule { }
