import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { PointsComponent } from './points/points.component';
import { CardPileComponent } from './components/card-pile/card-pile.component';
import { TurnInfoComponent } from './components/turn-info/turn-info.component';
import { HandComponent } from 'src/app/components/hand/hand.component';

@NgModule({
  declarations: [
    AppComponent,
    CardPileComponent,
    TurnInfoComponent,
    HandComponent,
    PointsComponent
  ],
  imports: [
    BrowserModule, HttpClientModule,
  ],
  providers: [HttpClientModule],
  bootstrap: [AppComponent]
})
export class AppModule { }
