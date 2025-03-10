import { useState, useContext } from 'preact/hooks';
import { h } from 'preact';
import { supabase } from '../supabaseClient';
import { AppContext } from '../App';

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

    return (
        <div className="signup-container" style={{ 
            maxWidth: '400px', 
            margin: '100px auto', 
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            backgroundColor: 'white'
        }}>
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Create Account</h2>
            
            <form onSubmit={handleSignup}>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #ddd'
                        }}
                    />
                </div>
                
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
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
            </form>
            
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <p>Already have an account?
                    <button
                        onClick={goToLogin}
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
                        Log In
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Signup; 