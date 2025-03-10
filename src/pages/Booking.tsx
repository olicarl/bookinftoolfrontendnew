import { useState, useEffect, useContext, useRef, useCallback } from 'preact/hooks';
import { h } from 'preact';
import { fabric } from 'fabric';
import { supabase } from '../supabaseClient';
import { AppContext } from '../App';
import type { Session } from '@supabase/supabase-js';

interface AppContextType {
    session: Session | null;
    setFlashMessages: (messages: Array<{ category: string; message: string }>) => void;
}

declare module "preact" {
    namespace JSX {
        interface IntrinsicElements {
            "sl-select": any;
            "sl-option": any;
            "sl-button": any;
            "sl-icon": any;
            "sl-input": any;
        }
    }
}

interface OfficeSpace {
    id: string;
    name: string;
    layout_json: string;
}

interface Desk {
    id: string;
    name: string;
    office_space_id: string;
}

interface Booking {
    id: string;
    desk_id: string;
    user_id: string;
    date: string;
    time_slot: 'full_day' | 'morning' | 'afternoon';
    user_name?: string;
}

interface DeskShape {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    name: string;
    rotation: number;
}

// Add an interface for the user mapping
interface UserMapping {
    user_id: string;
    name: string;
}

// Store canvas instance outside of component to prevent multiple instances
let globalCanvasInstance: fabric.Canvas | null = null;

// Helper to manage user mapping cache
const USER_MAPPINGS_KEY = 'booking_user_mappings';
const USER_MAPPINGS_EXPIRY_KEY = 'booking_user_mappings_expiry';
const CACHE_EXPIRY_MS = 3600000; // 1 hour in milliseconds

const getUserMappingsFromCache = (): Record<string, string> | null => {
    try {
        const expiryStr = localStorage.getItem(USER_MAPPINGS_EXPIRY_KEY);
        if (!expiryStr) return null;
        
        const expiry = parseInt(expiryStr, 10);
        if (Date.now() > expiry) {
            // Cache expired
            localStorage.removeItem(USER_MAPPINGS_KEY);
            localStorage.removeItem(USER_MAPPINGS_EXPIRY_KEY);
            return null;
        }
        
        const mappingsStr = localStorage.getItem(USER_MAPPINGS_KEY);
        return mappingsStr ? JSON.parse(mappingsStr) : null;
    } catch (error) {
        console.error('Error reading user mappings from cache:', error);
        return null;
    }
};

const saveUserMappingsToCache = (mappings: Record<string, string>) => {
    try {
        localStorage.setItem(USER_MAPPINGS_KEY, JSON.stringify(mappings));
        localStorage.setItem(USER_MAPPINGS_EXPIRY_KEY, (Date.now() + CACHE_EXPIRY_MS).toString());
    } catch (error) {
        console.error('Error saving user mappings to cache:', error);
    }
};

const BookingPage = () => {
    const { session, setFlashMessages } = useContext(AppContext) as AppContextType;
    const [officeSpaces, setOfficeSpaces] = useState<OfficeSpace[]>([]);
    const [selectedOfficeSpaceId, setSelectedOfficeSpaceId] = useState<string | null>(null);
    const [desks, setDesks] = useState<Desk[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [dates, setDates] = useState<string[]>([]);
    const [deskShapes, setDeskShapes] = useState<DeskShape[]>([]);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
    const canvasContainerId = useRef(`booking-canvas-container-${Date.now()}`);
    const userMappingFetchedRef = useRef(false);
    
    // Responsive design helper
    const isMobile = windowWidth < 768;

    // Track window size for responsiveness
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
            resizeCanvas();
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Resize canvas when window size changes
    const resizeCanvas = () => {
        if (!globalCanvasInstance || !selectedOfficeSpaceId) return;
        
        // Calculate canvas width based on screen size
        const isMobile = window.innerWidth < 768;
        const canvasWidth = isMobile ? window.innerWidth - 40 : 800;
        const canvasHeight = isMobile ? 400 : 600;
        
        globalCanvasInstance.setWidth(canvasWidth);
        globalCanvasInstance.setHeight(canvasHeight);
        globalCanvasInstance.renderAll();
    };

    // Fetch user mappings only once when component mounts
    useEffect(() => {
        const fetchUserMappings = async () => {
            // If we've already fetched or there's no session, don't fetch again
            if (userMappingFetchedRef.current || !session) return;
            
            // Check for cached mappings first
            const cachedMappings = getUserMappingsFromCache();
            if (cachedMappings) {
                console.log('Using cached user mappings');
                setUserNameMap(cachedMappings);
                userMappingFetchedRef.current = true;
                return;
            }
            
            try {
                console.log('Fetching user mappings from edge function');
                const { data, error } = await supabase.functions.invoke('my-function');
                
                if (error) {
                    console.error('Error fetching user mappings:', error);
                } else if (data) {
                    console.log('Fetched user mappings:', data);
                    
                    // Convert the array to a lookup object
                    const mappings = data.reduce((acc: Record<string, string>, item: UserMapping) => {
                        acc[item.user_id] = item.name;
                        return acc;
                    }, {});
                    
                    setUserNameMap(mappings);
                    
                    // Save to cache for future use
                    saveUserMappingsToCache(mappings);
                    
                    // Mark as fetched so we don't fetch again
                    userMappingFetchedRef.current = true;
                }
            } catch (error) {
                console.error('Error calling user mapping function:', error);
            }
        };
        
        fetchUserMappings();
        
        // Clean up function
        return () => {
            // Reset the flag when component unmounts
            userMappingFetchedRef.current = false;
        };
    }, [session]);

    // Generate dates (only once, on initial mount)
    useEffect(() => {
        console.log('BookingPage: Initializing component');
        const today = new Date();
        const dateArray = Array.from({ length: 7 }, (_, i) => {
            const nextDate = new Date(today);
            nextDate.setDate(today.getDate() + i);
            return nextDate.toISOString().split('T')[0];
        });
        setDates(dateArray);

        // Clean up function
        return () => {
            console.log('BookingPage: Cleaning up component');
            if (globalCanvasInstance) {
                console.log('BookingPage: Disposing canvas');
                globalCanvasInstance.dispose();
                globalCanvasInstance = null;
            }
        };
    }, []);

    // Fetch office spaces
    useEffect(() => {
        const fetchOfficeSpaces = async () => {
            if (!session) return;
            console.log('BookingPage: Fetching office spaces');
            setLoading(true);
            
            try {
                const { data, error } = await supabase
                    .from('office_spaces')
                    .select('id, name, layout_json')
                    .order('name');

                if (error) {
                    console.error('Error fetching office spaces:', error);
                    setFlashMessages([{ category: 'error', message: error.message }]);
                } else {
                    console.log('BookingPage: Fetched office spaces:', data);
                    setOfficeSpaces(data || []);
                }
            } catch (error) {
                console.error('Error fetching office spaces:', error);
                setFlashMessages([{ category: 'error', message: 'An unexpected error occurred.' }]);
            } finally {
                setLoading(false);
            }
        };

        fetchOfficeSpaces();
    }, [session, setFlashMessages]);

    // Fetch desks when office space changes
    useEffect(() => {
        const fetchDesks = async () => {
            if (!selectedOfficeSpaceId) {
                setDesks([]);
                return;
            }

            console.log(`BookingPage: Fetching desks for office ${selectedOfficeSpaceId}`);
            setLoading(true);
            
            try {
                const { data, error } = await supabase
                    .from('desks')
                    .select('id, name, office_space_id')
                    .eq('office_space_id', selectedOfficeSpaceId)
                    .order('name');

                if (error) {
                    console.error('Error fetching desks:', error);
                    setFlashMessages([{ category: 'error', message: error.message }]);
                    setLoading(false);
                } else {
                    console.log('BookingPage: Fetched desks:', data);
                    const deskData = data || [];
                    setDesks(deskData);
                    
                    // Immediately fetch bookings after desks are fetched
                    if (deskData.length > 0) {
                        await fetchBookingsForDesks(deskData);
                    } else {
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error('Error fetching desks:', error);
                setFlashMessages([{ category: 'error', message: 'An unexpected error occurred.' }]);
                setLoading(false);
            }
        };

        fetchDesks();
    }, [selectedOfficeSpaceId, setFlashMessages]);

    // Define fetchBookings as a reusable function
    const fetchBookingsForDesks = async (desksList: Desk[]) => {
        if (!desksList.length || dates.length === 0) {
            setBookings([]);
            setLoading(false);
            return;
        }

        console.log(`BookingPage: Fetching bookings for ${desksList.length} desks`);
        
        try {
            // Use standard booking fetch
            const { data, error } = await supabase
                .from('bookings')
                .select('id, desk_id, user_id, date, time_slot')
                .in('desk_id', desksList.map(desk => desk.id))
                .gte('date', dates[0])
                .lte('date', dates[dates.length - 1])
                .order('date');

            if (error) {
                console.error('Error fetching bookings:', error);
                setFlashMessages([{ category: 'error', message: error.message }]);
            } else {
                console.log('BookingPage: Fetched bookings:', data);
                setBookings(data || []);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setFlashMessages([{ category: 'error', message: 'An unexpected error occurred.' }]);
        } finally {
            setLoading(false);
        }
    };

    // Keep the existing useEffect for booking updates when dates change
    useEffect(() => {
        // Only fetch if desks are already loaded but bookings need updating
        // This handles cases like date changes or viewing different weeks
        if (desks.length > 0 && selectedOfficeSpaceId) {
            fetchBookingsForDesks(desks);
        }
    }, [dates, setFlashMessages]); // Only update on date changes

    // Render layout when office space or bookings change
    useEffect(() => {
        const renderLayout = async () => {
            if (!selectedOfficeSpaceId) {
                return;
            }

            const officeSpace = officeSpaces.find((os) => os.id === selectedOfficeSpaceId);
            if (!officeSpace) {
                console.error('Selected office space not found');
                return;
            }
            
            try {
                console.log('BookingPage: Rendering layout');
                
                // Clear any existing canvas container content
                const container = document.getElementById(canvasContainerId.current);
                if (!container) {
                    console.error(`Canvas container with ID ${canvasContainerId.current} not found`);
                    return;
                }
                
                container.innerHTML = '';
                
                // Create a fresh canvas element
                const canvasElement = document.createElement('canvas');
                canvasElement.id = 'office-canvas';
                canvasElement.style.border = '1px solid #ddd';
                container.appendChild(canvasElement);
                
                // Determine canvas size based on device
                const isMobile = window.innerWidth < 768;
                const canvasWidth = isMobile ? window.innerWidth - 40 : 800;
                const canvasHeight = isMobile ? 400 : 600;
                
                // Initialize canvas
                if (globalCanvasInstance) {
                    globalCanvasInstance.dispose();
                }
                
                globalCanvasInstance = new fabric.Canvas('office-canvas', {
                    width: canvasWidth,
                    height: canvasHeight,
                    backgroundColor: '#ffffff',
                    selection: false,
                    interactive: false
                });
                
                // Parse layout data
                const parsedLayout = JSON.parse(officeSpace.layout_json || '[]');
                if (!Array.isArray(parsedLayout)) {
                    throw new Error('Invalid layout data');
                }
                
                setDeskShapes(parsedLayout);

                // Add desks to canvas
                parsedLayout.forEach((desk: DeskShape) => {
                    const hasBookings = bookings.some(booking => 
                        booking.desk_id === desk.id
                    );

                    // Create the desk rectangle
                    const fabricDesk = new fabric.Rect({
                        left: 0,
                        top: 0,
                        width: desk.width,
                        height: desk.height,
                        fill: hasBookings ? '#ff4444' : '#4CAF50',
                        selectable: false,
                        data: { id: desk.id, name: desk.name }
                    });

                    // Create the desk label
                    const text = new fabric.Text(desk.name, {
                        left: desk.width / 2,
                        top: desk.height / 2,
                        fontSize: 12,
                        fill: 'white',
                        originX: 'center',
                        originY: 'center',
                        selectable: false
                    });

                    // Create a group with the desk and its label
                    const group = new fabric.Group([fabricDesk, text], {
                        left: desk.x,
                        top: desk.y,
                        angle: desk.rotation,
                        selectable: false,
                        hoverCursor: 'default',
                        data: { id: desk.id, name: desk.name }
                    });

                    // Add group to canvas (with null check)
                    if (globalCanvasInstance) {
                        globalCanvasInstance.add(group);
                    }
                });

                // Render all objects (with null check)
                if (globalCanvasInstance) {
                    globalCanvasInstance.renderAll();
                }
                console.log('BookingPage: Canvas rendered successfully');
            } catch (error) {
                console.error("Error rendering layout:", error);
                setFlashMessages([{ category: 'error', message: 'Error rendering office layout.' }]);
            }
        };

        renderLayout();
    }, [selectedOfficeSpaceId, officeSpaces, bookings, setFlashMessages]);

    const handleOfficeSpaceChange = (e: any) => {
        const target = e.target as HTMLSelectElement;
        const value = target.value;
        console.log('BookingPage: Selected office space:', value);
        setSelectedOfficeSpaceId(value || null);
    };

    const handleBookingSubmit = async (deskId: string, date: string, timeSlot: 'morning' | 'afternoon' | 'full_day') => {
        if (!session) {
            setFlashMessages([{ category: 'error', message: 'You must be logged in to make a booking.' }]);
            window.location.href = "/login";
            return;
        }

        console.log(`BookingPage: Creating booking for desk ${deskId} on ${date} (${timeSlot})`);
        setLoading(true);
        
        try {
            const { error } = await supabase.from('bookings').insert([
                {
                    desk_id: deskId,
                    user_id: session.user.id,
                    date: date,
                    time_slot: timeSlot,
                },
            ]);

            if (error) {
                console.error('Error creating booking:', error);
                setFlashMessages([{ category: 'error', message: error.message }]);
            } else {
                setFlashMessages([{ category: 'success', message: 'Booking created successfully!' }]);
                
                // Fetch updated bookings
                const { data, error: fetchError } = await supabase
                    .from('bookings')
                    .select('id, desk_id, user_id, date, time_slot')
                    .in('desk_id', desks.map((desk) => desk.id))
                    .gte('date', dates[0])
                    .lte('date', dates[dates.length - 1])
                    .order('date');

                if (!fetchError && data) {
                    setBookings(data);
                }
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            setFlashMessages([{ category: 'error', message: 'An unexpected error occurred.' }]);
        } finally {
            setLoading(false);
        }
    };

    // Update booking deletion to preserve scroll position
    const handleDeleteBooking = async (bookingId: string, event: React.MouseEvent) => {
        // Prevent default to avoid page navigation/refresh
        event.preventDefault();
        
        console.log(`BookingPage: Deleting booking ${bookingId}`);
        setLoading(true);
        
        try {
            const { error } = await supabase
                .from('bookings')
                .delete()
                .eq('id', bookingId);

            if (error) {
                console.error('Error deleting booking:', error);
                setFlashMessages([{ category: 'error', message: error.message }]);
            } else {
                setFlashMessages([{ category: 'success', message: 'Booking deleted successfully!' }]);
                
                // Update bookings without refreshing the entire page
                setBookings(prevBookings => prevBookings.filter(b => b.id !== bookingId));
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
            setFlashMessages([{ category: 'error', message: 'An unexpected error occurred.' }]);
        } finally {
            setLoading(false);
        }
    };

    // Organize bookings by desk and date
    const bookingsData: { [deskId: string]: { [date: string]: Booking[] } } = {};
    bookings.forEach((booking) => {
        if (!bookingsData[booking.desk_id]) {
            bookingsData[booking.desk_id] = {};
        }
        if (!bookingsData[booking.desk_id][booking.date]) {
            bookingsData[booking.desk_id][booking.date] = [];
        }
        bookingsData[booking.desk_id][booking.date].push(booking);
    });

    return (
        <div className="booking-page" style={{ 
            maxWidth: '1200px', 
            margin: '0 auto', 
            padding: isMobile ? '1rem' : '2rem' 
        }}>
            <h2 style={{ 
                marginBottom: isMobile ? '1.5rem' : '2rem', 
                color: '#333',
                fontSize: isMobile ? '1.5rem' : '2rem',
                textAlign: isMobile ? 'center' : 'left'
            }}>
                Book a Desk
            </h2>

            <div className="office-space-selector" style={{
                marginBottom: isMobile ? '1.5rem' : '2rem',
                padding: isMobile ? '1rem' : '1.5rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <h3 style={{ 
                    marginBottom: '1rem', 
                    color: '#444',
                    fontSize: isMobile ? '1.2rem' : '1.5rem',
                    textAlign: isMobile ? 'center' : 'left'
                }}>
                    Select Office
                </h3>
                <select
                    value={selectedOfficeSpaceId || ''}
                    onChange={handleOfficeSpaceChange}
                    disabled={loading}
                    style={{
                        padding: '0.75rem',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        width: '100%',
                        maxWidth: isMobile ? '100%' : '300px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                    }}
                >
                    <option value="">Select an office space</option>
                    {officeSpaces.map((officeSpace) => (
                        <option key={officeSpace.id} value={officeSpace.id}>
                            {officeSpace.name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedOfficeSpaceId && (
                <div className="office-layout" style={{
                    marginBottom: isMobile ? '1.5rem' : '2rem',
                    padding: isMobile ? '1rem' : '1.5rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ 
                        marginBottom: '1rem', 
                        color: '#444',
                        fontSize: isMobile ? '1.2rem' : '1.5rem',
                        textAlign: isMobile ? 'center' : 'left'
                    }}>
                        Office Layout
                    </h3>
                    {loading && <div style={{ 
                        padding: '20px', 
                        textAlign: 'center',
                        color: '#666'
                    }}>Loading office layout...</div>}
                    
                    {/* Canvas container with adaptive width */}
                    <div 
                        id={canvasContainerId.current}
                        style={{ 
                            overflow: 'auto',
                            width: '100%',
                            textAlign: 'center',
                            display: loading ? 'none' : 'block'
                        }}
                    >
                        {/* Canvas will be created dynamically here */}
                    </div>
                    
                    {isMobile && (
                        <div style={{ 
                            marginTop: '1rem', 
                            textAlign: 'center',
                            fontSize: '0.8rem',
                            color: '#666'
                        }}>
                            Tip: Red desks are already booked
                        </div>
                    )}
                </div>
            )}

            {selectedOfficeSpaceId && (
                <div className="booking-table" style={{
                    marginBottom: isMobile ? '1.5rem' : '2rem',
                    padding: isMobile ? '1rem' : '1.5rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    overflowX: 'auto'
                }}>
                    <h3 style={{ 
                        marginBottom: '1rem', 
                        color: '#444',
                        fontSize: isMobile ? '1.2rem' : '1.5rem',
                        textAlign: isMobile ? 'center' : 'left'
                    }}>
                        Available Bookings
                    </h3>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        minWidth: isMobile ? '600px' : 'auto'
                    }}>
                        <thead>
                            <tr>
                                <th style={{ 
                                    padding: '10px', 
                                    border: '1px solid #ddd',
                                    backgroundColor: '#f1f1f1',
                                    position: 'sticky',
                                    left: 0,
                                    zIndex: 1
                                }}>Desk</th>
                                {dates.map((date) => (
                                    <th key={date} style={{ 
                                        padding: '10px', 
                                        border: '1px solid #ddd',
                                        backgroundColor: '#f1f1f1',
                                        minWidth: '120px'
                                    }}>
                                        {new Date(date).toLocaleDateString(undefined, {
                                            weekday: isMobile ? 'short' : 'long',
                                            month: isMobile ? 'numeric' : 'short',
                                            day: 'numeric'
                                        })}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {desks.map((desk) => (
                                <tr key={desk.id}>
                                    <td style={{ 
                                        padding: '10px', 
                                        border: '1px solid #ddd',
                                        fontWeight: 'bold',
                                        backgroundColor: '#f9f9f9',
                                        position: 'sticky',
                                        left: 0
                                    }}>{desk.name}</td>
                                    {dates.map((date) => {
                                        const deskBookings = bookingsData[desk.id]?.[date] || [];
                                        return (
                                            <td key={date} style={{ 
                                                padding: '10px', 
                                                border: '1px solid #ddd',
                                                verticalAlign: 'top'
                                            }}>
                                                {deskBookings.map((booking) => (
                                                    <div key={booking.id} className="booking-slot" style={{ 
                                                        marginBottom: '8px',
                                                        padding: '8px',
                                                        backgroundColor: booking.user_id === session?.user.id ? '#e6ffe6' : '#ffe0e0',
                                                        borderRadius: '4px'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            marginBottom: '4px'
                                                        }}>
                                                            <span style={{
                                                                fontWeight: 'bold', 
                                                                textTransform: 'capitalize'
                                                            }}>
                                                                {booking.time_slot.replace('_', ' ')}
                                                            </span>
                                                            {booking.user_id === session?.user.id && (
                                                                <button
                                                                    onClick={(e) => handleDeleteBooking(booking.id, e)}
                                                                    style={{
                                                                        padding: '4px 8px',
                                                                        background: '#ff4444',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                        {/* Display the user name from the mapping */}
                                                        <div style={{
                                                            fontSize: '0.85rem',
                                                            color: '#555'
                                                        }}>
                                                            Booked by: {userNameMap[booking.user_id] || 'Unknown user'}
                                                        </div>
                                                    </div>
                                                ))}
                                                {deskBookings.length === 0 && (
                                                    <div className="booking-actions" style={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column',
                                                        gap: '8px'
                                                    }}>
                                                        <button
                                                            onClick={() => handleBookingSubmit(desk.id, date, 'morning')}
                                                            disabled={loading}
                                                            style={{
                                                                padding: '8px',
                                                                background: '#4CAF50',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                opacity: loading ? 0.7 : 1
                                                            }}
                                                        >
                                                            Morning
                                                        </button>
                                                        <button
                                                            onClick={() => handleBookingSubmit(desk.id, date, 'afternoon')}
                                                            disabled={loading}
                                                            style={{
                                                                padding: '8px',
                                                                background: '#4CAF50',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                opacity: loading ? 0.7 : 1
                                                            }}
                                                        >
                                                            Afternoon
                                                        </button>
                                                        <button
                                                            onClick={() => handleBookingSubmit(desk.id, date, 'full_day')}
                                                            disabled={loading}
                                                            style={{
                                                                padding: '8px',
                                                                background: '#4CAF50',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                opacity: loading ? 0.7 : 1
                                                            }}
                                                        >
                                                            Full Day
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default BookingPage; 