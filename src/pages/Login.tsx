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

    return (
        <div className="login-container" style={{ 
            maxWidth: '400px', 
            margin: '100px auto', 
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Login</h2>
            
            <form onSubmit={handleLogin} style={{ width: '100%' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <sl-input
                        type="email"
                        label="Email"
                        value={email}
                        onInput={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: '100%' }}
                    ></sl-input>
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <sl-input
                        type="password"
                        label="Password"
                        value={password}
                        onInput={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: '100%' }}
                    ></sl-input>
                </div>
                
                <sl-button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    style={{ width: '100%' }}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </sl-button>
            </form>
            
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <p>Don't have an account? 
                    <sl-button
                        onClick={goToSignup}
                        variant="text"
                        style={{ color: '#4CAF50', padding: '0 0.5rem' }}
                    >
                        Sign up
                    </sl-button>
                </p>
            </div>
        </div>
    );
};

export default Login; 