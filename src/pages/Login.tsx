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
            backgroundColor: 'white'
        }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Login</h2>
            
            <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    />
                </div>
                
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.currentTarget.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    />
                </div>
                
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <p>Don't have an account? 
                    <button
                        onClick={goToSignup}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#4CAF50',
                            cursor: 'pointer',
                            padding: '0 0.5rem',
                            fontSize: 'inherit',
                            textDecoration: 'underline'
                        }}
                    >
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login; 