import { useState, useEffect, useContext } from 'preact/hooks';
import { h } from 'preact';
import { supabase } from '../supabaseClient';
import { AppContext } from '../App';
import type { Session } from '@supabase/supabase-js';

interface AppContextType {
    session: Session | null;
    setFlashMessages: (messages: Array<{ category: string; message: string }>) => void;
}

const JoinOffice = () => {
    const { session, setFlashMessages } = useContext(AppContext) as AppContextType;
    const [loading, setLoading] = useState(false);
    const [officeId, setOfficeId] = useState('');
    const [officeName, setOfficeName] = useState('');

    useEffect(() => {
        // Extract office ID from URL if present
        const params = new URLSearchParams(window.location.search);
        const idFromUrl = params.get('office_id');
        if (idFromUrl) {
            setOfficeId(idFromUrl);
            fetchOfficeName(idFromUrl);
        }
    }, []);

    const fetchOfficeName = async (id: string) => {
        console.log('JoinOffice: Fetching office details for ID:', id);
        if (!id) return;

        try {
            const { data, error } = await supabase
                .from('office_spaces')
                .select('name')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching office name:', error);
                setFlashMessages([{ category: 'error', message: error.message }]);
            } else if (data) {
                console.log('JoinOffice: Found office:', data.name);
                setOfficeName(data.name);
            }
        } catch (error) {
            console.error('Error in fetchOfficeName:', error);
            setFlashMessages([{ category: 'error', message: 'An unexpected error occurred.' }]);
        }
    };

    const handleJoinOffice = async (e: Event) => {
        e.preventDefault();
        console.log('JoinOffice: Attempting to join office:', officeId);
        
        if (!session) {
            setFlashMessages([{ 
                category: 'error', 
                message: 'You must be logged in to join an office.' 
            }]);
            window.location.href = '/login';
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('user_office_access')
                .insert([{ 
                    user_id: session.user.id,
                    office_space_id: officeId
                }]);

            if (error) {
                console.error('Error joining office:', error);
                setFlashMessages([{ category: 'error', message: error.message }]);
            } else {
                setFlashMessages([{ category: 'success', message: 'Successfully joined the office space!' }]);
                // Navigate to booking page after successful join
                window.location.href = '/booking';
            }
        } catch (error) {
            console.error('Error in handleJoinOffice:', error);
            setFlashMessages([{ category: 'error', message: 'An unexpected error occurred.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="join-office-container" style={{ 
            maxWidth: '500px', 
            margin: '100px auto', 
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            backgroundColor: 'white' 
        }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Join Office Space</h2>
            
            {officeName && (
                <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '1rem', 
                    borderRadius: '4px',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                }}>
                    <p>You are about to join: <strong>{officeName}</strong></p>
                </div>
            )}
            
            <form onSubmit={handleJoinOffice}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Office ID</label>
                    <input
                        type="text"
                        value={officeId}
                        onChange={(e) => setOfficeId(e.currentTarget.value)}
                        placeholder="Enter office ID"
                        required
                        disabled={!!officeName}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            backgroundColor: officeName ? '#f0f0f0' : 'white'
                        }}
                    />
                </div>
                
                <button
                    type="submit"
                    disabled={loading || !officeId}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        opacity: (loading || !officeId) ? 0.7 : 1
                    }}
                >
                    {loading ? 'Joining...' : 'Join Office'}
                </button>
            </form>
            
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button
                    onClick={() => window.location.href = '/booking'}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#2196F3',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        textDecoration: 'underline'
                    }}
                >
                    Cancel and return to Booking
                </button>
            </div>
        </div>
    );
};

export default JoinOffice; 