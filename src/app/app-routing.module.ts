import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GameComponent } from 'src/app/components/game/game.component';
import { HowToPlayComponent } from 'src/app/components/how-to-play/how-to-play.component';

const routes: Routes = [
    { path: '', component: GameComponent }, // Default route
    { path: 'game', component: GameComponent },
    { path: 'how-to-play', component: HowToPlayComponent }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {}
