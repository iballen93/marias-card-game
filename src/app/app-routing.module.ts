import { NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, RouteReuseStrategy, RouterModule, Routes } from '@angular/router';
import { GameComponent } from 'src/app/components/game/game.component';
import { HowToPlayComponent } from 'src/app/components/how-to-play/how-to-play.component';
import { DEFAULT_GAME_MODE, GameMode } from 'src/app/game-mode';

const gameRoute = (mode: GameMode) => ({ path: 'game/' + mode, component: GameComponent, data: { mode } });

const routes: Routes = [
    // the app opens on, and older links to /game still reach, the original game
    { path: '', pathMatch: 'full', redirectTo: 'game/' + DEFAULT_GAME_MODE },
    { path: 'game', pathMatch: 'full', redirectTo: 'game/' + DEFAULT_GAME_MODE },
    gameRoute('learning-solo'),
    gameRoute('learning-pc'),
    // Standard gets its route once it's built; the menu shows it greyed out until then
    { path: 'how-to-play', component: HowToPlayComponent }
];

// Choosing a New Game option while already in that game must start a fresh game, not keep the current one
export class NewGameRouteReuseStrategy extends BaseRouteReuseStrategy {
    shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
        return super.shouldReuseRoute(future, current) && !future.data?.mode;
    }
}

@NgModule({
    imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
    exports: [RouterModule],
    providers: [{ provide: RouteReuseStrategy, useClass: NewGameRouteReuseStrategy }]
})
export class AppRoutingModule {}
