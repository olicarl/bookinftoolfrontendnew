import { useContext } from 'preact/hooks';
import { h } from 'preact';
import { Link } from 'preact-router/match';
import { supabase } from '../supabaseClient';
import FlashMessage from './FlashMessage';
import { AppContext } from '../App';

declare module "preact" {
    namespace JSX {
        interface IntrinsicElements {
            "sl-tab-group": any;
            "sl-tab": any;
            "sl-tab-panel": any;
            "sl-tab-bar": any;
        }
    }
}

interface AppLayoutProps {
    children: preact.ComponentChildren;
    currentPath: string;
    navigateTo: (path: string) => void;
}

const AppLayout = ({ children, currentPath, navigateTo }: AppLayoutProps) => {
    const { session, flashMessages, setFlashMessages } = useContext(AppContext);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            setFlashMessages([{ category: 'error', message: 'Failed to log out.' }]);
        } else {
            setFlashMessages([{ category: 'success', message: 'Successfully logged out.' }]);
            navigateTo('/login');
        }
    };

    const getNavItemStyle = (path: string) => ({
        textDecoration: 'none',
        color: '#333',
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        backgroundColor: currentPath === path ? '#e0e0e0' : 'transparent',
        cursor: 'pointer',
        display: 'inline-block'
    });

    return (
        <div className="app-container">
            <nav className="main-nav" style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '1rem',
                marginBottom: '1rem',
                borderBottom: '1px solid #ddd'
            }}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    width: '100%'
                }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <Link 
                            href="/settings"
                            style={getNavItemStyle('/settings')}
                        >
                            Settings
                        </Link>
                        <Link 
                            href="/booking"
                            style={getNavItemStyle('/booking')}
                        >
                            Booking
                        </Link>
                    </div>
                    <button 
                        onClick={handleLogout}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#333',
                            cursor: 'pointer',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            fontFamily: 'inherit',
                            fontSize: 'inherit'
                        }}
                    >
                        Logout
                    </button>
                </div>
            </nav>

            {flashMessages.map((msg, index) => (
                <FlashMessage key={index} category={msg.category} message={msg.message} />
            ))}

            <main style={{ 
                maxWidth: '1200px', 
                margin: '0 auto', 
                padding: '0 1rem'
            }}>
                {children}
            </main>
        </div>
    );
};

export default AppLayout; 