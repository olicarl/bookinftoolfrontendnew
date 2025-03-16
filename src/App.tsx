import { useState, useEffect } from 'preact/hooks';
import { h, createContext } from 'preact';
import { Router, route } from 'preact-router';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { FlashMessageType, AppContextInterface } from './types';
import AppLayout from './pages/AppLayout';
import BookingPage from './pages/Booking';
import Settings from './pages/Settings';
import Login from './pages/Login';
import JoinOffice from './pages/JoinOffice';
import Signup from './pages/Signup';

export const AppContext = createContext<AppContextInterface>({
    session: null,
    flashMessages: [],
    setFlashMessages: () => {},
});

// Global state to track route changes and prevent duplicate renders
const routeState = {
    currentPath: window.location.pathname,
    isNavigating: false
};

export function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [flashMessages, setFlashMessages] = useState<FlashMessageType[]>([]);
    const [currentPath, setCurrentPath] = useState<string>(routeState.currentPath);

    useEffect(() => {
        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    // Handle route changes
    const handleRoute = (e: { url: string }) => {
        console.log("Route changed to:", e.url);
        
        // If this is a duplicate event for the same path, ignore it
        if (routeState.currentPath === e.url && routeState.isNavigating) {
            console.log("Ignoring duplicate route change event");
            return;
        }
        
        // Update global route state
        routeState.currentPath = e.url;
        routeState.isNavigating = true;
        
        // Update component state
        setCurrentPath(e.url);
        
        // Reset navigation flag after a delay
        setTimeout(() => {
            routeState.isNavigating = false;
        }, 50);
    };

    // Navigation helper function that uses preact-router
    const navigateTo = (path: string) => {
        // Only navigate if not already navigating to prevent double-renders
        if (!routeState.isNavigating) {
            routeState.isNavigating = true;
            route(path);
            
            // Reset navigation flag after a short delay
            setTimeout(() => {
                routeState.isNavigating = false;
            }, 50);
        }
    };

    // Determine if we're on an auth page (login/signup)
    const isAuthPage = !session && ['/login', '/signup'].includes(currentPath);

    // Use AppLayout for all pages, with different content based on auth state
    return (
        <AppContext.Provider value={{ session, flashMessages, setFlashMessages }}>
            <AppLayout 
                currentPath={currentPath} 
                navigateTo={navigateTo}
                showNavigation={!!session} // Only show navigation when logged in
            >
                <Router onChange={handleRoute}>
                    {/* Available to logged in users */}
                    <Settings path="/settings" />
                    <BookingPage path="/booking" />
                    <JoinOffice path="/join-office" />
                    
                    {/* Auth pages */}
                    <Login path="/login" />
                    <Signup path="/signup" />
                    
                    {/* Default routes */}
                    {session ? <Settings default /> : <Login default />}
                </Router>
            </AppLayout>
        </AppContext.Provider>
    );
} 