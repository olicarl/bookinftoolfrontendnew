import { useState, useContext } from 'preact/hooks';
import { h } from 'preact';
import { supabase } from '../supabaseClient';
import { AppContext } from '../App';

declare module "preact" {
    namespace JSX {
        interface IntrinsicElements {
            "sl-input": any;
            "sl-button": any;
            "sl-icon": any;
            "sl-card": any;
            "sl-divider": any;
        }
    }
}

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { setFlashMessages } = useContext(AppContext);

    const handleLogin = async (e: Event) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setFlashMessages([{ category: 'error', message: error.message }]);
            } else {
                setFlashMessages([{ category: 'success', message: "Login successful" }]);
                window.location.href = "/booking";
            }
        } catch (err) {
            setFlashMessages([{ 
                category: 'error', 
                message: err instanceof Error ? err.message : 'An unexpected error occurred' 
            }]);
        } finally {
            setLoading(false);
        }
    };

    const goToSignup = () => {
        window.location.href = "/signup";
    };

    // Page container styles - takes full available height
    const pageContainerStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 130px)', // Account for navbar and some padding
        padding: '20px'
    };

    // Card styles
    const cardStyle = {
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        borderRadius: '8px',
        backgroundColor: '#f5f5f5', // Match navbar color
        '--padding': '1.5rem', // Increase overall card padding
    };

    // Form styles
    const formStyle = {
        padding: '1rem 0.75rem'
    };

    // Input container styles
    const inputContainerStyle = {
        marginBottom: '1.5rem'
    };

    return (
        <div style={pageContainerStyle}>
            <sl-card style={cardStyle}>
                <div slot="header" style={{ 
                    textAlign: 'center', 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold',
                    padding: '0.75rem 0'
                }}>
                    Login
                </div>
                
                <form onSubmit={handleLogin} style={formStyle}>
                    <div style={inputContainerStyle}>
                        <sl-input
                            type="email"
                            label="Email"
                            placeholder="Enter your email"
                            value={email}
                            onInput={(e: { target: { value: string } }) => setEmail(e.target.value)}
                            required
                            style={{ width: '100%' }}
                            size="medium"
                        ></sl-input>
                    </div>
                    
                    <div style={inputContainerStyle}>
                        <sl-input
                            type="password"
                            label="Password"
                            placeholder="Enter your password"
                            value={password}
                            onInput={(e: { target: { value: string } }) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%' }}
                            size="medium"
                            togglePassword
                        ></sl-input>
                    </div>
                    
                    <div style={{ marginTop: '2rem' }}>
                        <sl-button
                            type="submit"
                            variant="primary"
                            loading={loading}
                            style={{ width: '100%' }}
                            size="medium"
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </sl-button>
                    </div>
                </form>
                
                <div slot="footer" style={{ textAlign: 'center', padding: '0.75rem 0' }}>
                    <sl-divider style={{ margin: '0.5rem 0 1rem 0' }}></sl-divider>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        Don't have an account?
                        <sl-button
                            variant="text"
                            size="small"
                            onClick={goToSignup}
                            style={{ color: '#4CAF50', fontWeight: 'bold', marginLeft: '0.25rem' }}
                        >
                            Sign up
                        </sl-button>
                    </div>
                </div>
            </sl-card>
        </div>
    );
};

export default Login; 