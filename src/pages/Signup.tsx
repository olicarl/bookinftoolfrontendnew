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

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const { setFlashMessages } = useContext(AppContext);

    const handleSignup = async (e: Event) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    "Display name": name,
                },
            },
        });

        if (error) {
            setFlashMessages([{ category: 'error', message: error.message }]);
            setLoading(false);
            console.error("Error signing up:", error);
        } else {
            setFlashMessages([{ category: 'success', message: "Signup successful! Please check your email for the confirmation link." }]);
            window.location.href = "/login";
        }
    };

    const goToLogin = () => {
        window.location.href = "/login";
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
                    Create Account
                </div>
                
                <form onSubmit={handleSignup} style={formStyle}>
                    <div style={inputContainerStyle}>
                        <sl-input
                            type="text"
                            label="Full Name"
                            placeholder="Enter your full name"
                            value={name}
                            onInput={(e: { target: { value: string } }) => setName(e.target.value)}
                            required
                            style={{ width: '100%' }}
                            size="medium"
                        ></sl-input>
                    </div>
                    
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
                            placeholder="Create a password"
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
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </sl-button>
                    </div>
                </form>
                
                <div slot="footer" style={{ textAlign: 'center', padding: '0.75rem 0' }}>
                    <sl-divider style={{ margin: '0.5rem 0 1rem 0' }}></sl-divider>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        Already have an account?
                        <sl-button
                            variant="text"
                            size="small"
                            onClick={goToLogin}
                            style={{ color: '#4CAF50', fontWeight: 'bold', marginLeft: '0.25rem' }}
                        >
                            Log In
                        </sl-button>
                    </div>
                </div>
            </sl-card>
        </div>
    );
};

export default Signup; 