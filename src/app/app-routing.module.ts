import { NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy, RouteReuseStrategy, RouterModule, Routes } from '@angular/router';
import { GameComponent } from 'src/app/components/game/game.component';
import { HowToPlayComponent } from 'src/app/components/how-to-play/how-to-play.component';

const routes: Routes = [
    { path: '', component: GameComponent }, // Default route
    { path: 'game', component: GameComponent },
    { path: 'how-to-play', component: HowToPlayComponent }
];

// Clicking New Game while already on /game must start a fresh game, not keep the current one
export class NewGameRouteReuseStrategy extends BaseRouteReuseStrategy {
    shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
        return super.shouldReuseRoute(future, current) && future.routeConfig?.path !== 'game';
    }
}

@NgModule({
    imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
    exports: [RouterModule],
    providers: [{ provide: RouteReuseStrategy, useClass: NewGameRouteReuseStrategy }]
})
export class AppRoutingModule {}
