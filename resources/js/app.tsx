import '../css/app.css';
import 'react-day-picker/style.css';

// Imports do React e Inertia
import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { route } from 'ziggy-js';

// Define o nome da sua aplicação
const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Inicializa a aplicação Inertia
createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    
    // Esta função é a mais importante: ela diz ao Inertia como carregar
    // os componentes da pasta /pages. Por exemplo, se o Laravel mandar
    // renderizar 'Users/Show', ela vai buscar o arquivo './pages/Users/Show.tsx'.
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    
    // Esta função configura o React. É aqui que o seu 'createRoot' entra.
    setup({ el, App, props }) {
        // Configura o Ziggy para usar as rotas do Laravel
        if (typeof window !== 'undefined') {
            window.route = route;
        }
        
        const root = createRoot(el);
        // O <App /> aqui não é o seu, é o componente principal do Inertia
        // que irá gerenciar as páginas e props.
        root.render(<App {...props} />);
    },
    
    // Barra de progresso opcional
    progress: {
        color: '#4B5563',
    },
});
