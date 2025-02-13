import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { PointsComponent } from './points/points.component';
import { CardPileComponent } from './components/card-pile/card-pile.component';

@NgModule({
  declarations: [
    AppComponent,
    CardPileComponent,
    PointsComponent
  ],
  imports: [
    BrowserModule, HttpClientModule,
  ],
  providers: [HttpClientModule],
  bootstrap: [AppComponent]
})
export class AppModule { }
