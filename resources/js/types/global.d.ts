import { route as ziggyRoute } from 'ziggy-js';

declare global {
    interface Window {
        route: typeof ziggyRoute;
    }
    
    var route: typeof ziggyRoute;
}

export {};