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
    display_name: string;
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

// Store canvas instance outside of component to prevent multiple instances
let globalCanvasInstance: fabric.Canvas | null = null;

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
    const canvasContainerId = useRef(`booking-canvas-container-${Date.now()}`);
    
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
            if (!selectedOfficeSpaceId) return;
            console.log('BookingPage: Fetching desks for office space:', selectedOfficeSpaceId);
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
                } else {
                    console.log('BookingPage: Fetched desks:', data);
                    setDesks(data || []);
                    if (data && data.length > 0) {
                        fetchBookingsForDesks(data);
                    }
                }
            } catch (error) {
                console.error('Error fetching desks:', error);
                setFlashMessages([{ category: 'error', message: 'An unexpected error occurred.' }]);
            } finally {
                setLoading(false);
            }
        };

        fetchDesks();
    }, [selectedOfficeSpaceId, setFlashMessages]);

    // Fetch bookings for desks
    const fetchBookingsForDesks = async (desksList: Desk[]) => {
        if (!selectedOfficeSpaceId) return;
        console.log('BookingPage: Fetching bookings for desks');
        
        try {
            const deskIds = desksList.map(desk => desk.id);
            const { data, error } = await supabase
                .from('bookings')
                .select('id, desk_id, user_id, date, time_slot, display_name')
                .in('desk_id', deskIds)
                .gte('date', dates[0])
                .lte('date', dates[dates.length - 1]);

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
        }
    };

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
        if (!session?.user) {
            setFlashMessages([{ category: 'error', message: 'You must be logged in to make a booking.' }]);
            return;
        }

        try {
            // Get the user's display name from metadata with correct key "Display name"
            const displayName = session.user.user_metadata['Display name'] || 'Unknown User';

            const { data, error } = await supabase
                .from('bookings')
                .insert([
                    {
                        desk_id: deskId,
                        user_id: session.user.id,
                        date: date,
                        time_slot: timeSlot,
                        display_name: displayName
                    }
                ])
                .select();

            if (error) {
                console.error('Error creating booking:', error);
                setFlashMessages([{ category: 'error', message: error.message }]);
            } else {
                console.log('BookingPage: Created booking:', data);
                setFlashMessages([{ category: 'success', message: 'Booking created successfully!' }]);
                // Refresh bookings
                const updatedDesks = desks.filter(desk => desk.office_space_id === selectedOfficeSpaceId);
                if (updatedDesks.length > 0) {
                    fetchBookingsForDesks(updatedDesks);
                }
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            setFlashMessages([{ category: 'error', message: 'An unexpected error occurred.' }]);
        }
    };

    const handleBookingDelete = async (bookingId: string) => {
        if (!session) {
            setFlashMessages([{ category: 'error', message: 'You must be logged in to delete a booking.' }]);
            return;
        }
        
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
                // Refresh bookings after delete
                const updatedDesks = desks.filter(desk => desk.office_space_id === selectedOfficeSpaceId);
                if (updatedDesks.length > 0) {
                    fetchBookingsForDesks(updatedDesks);
                }
            }
        } catch (error) {
            console.error('Error deleting booking:', error);
            setFlashMessages([{ category: 'error', message: 'An unexpected error occurred.' }]);
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

    const renderBookingSlots = (desk: Desk, date: string) => {
        const existingBookings = bookings.filter(
            booking => booking.desk_id === desk.id && booking.date === date
        );

        const morningBooked = existingBookings.some(b => b.time_slot === 'morning' || b.time_slot === 'full_day');
        const afternoonBooked = existingBookings.some(b => b.time_slot === 'afternoon' || b.time_slot === 'full_day');
        const fullDayBooked = existingBookings.some(b => b.time_slot === 'full_day');

        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
            }}>
                {/* Show existing bookings with improved delete button */}
                {existingBookings.map(booking => (
                    <div key={booking.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: '#f0f0f0',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        marginBottom: '4px'
                    }}>
                        <div>
                            <div style={{ fontWeight: 'bold' }}>
                                {booking.time_slot === 'morning' ? 'Morning' :
                                 booking.time_slot === 'afternoon' ? 'Afternoon' : 'Full Day'}
                            </div>
                            <div style={{ fontSize: '0.9em', color: '#555' }}>
                                Booked by: {booking.display_name}
                            </div>
                        </div>
                        {session?.user?.id === booking.user_id && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent event bubbling
                                    handleBookingDelete(booking.id);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ff4444',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    borderRadius: '4px',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#ffeeee'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}

                {/* Show available booking options */}
                {!fullDayBooked && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                        {!morningBooked && (
                            <button
                                onClick={() => handleBookingSubmit(desk.id, date, 'morning')}
                                style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Book Morning
                            </button>
                        )}
                        {!afternoonBooked && (
                            <button
                                onClick={() => handleBookingSubmit(desk.id, date, 'afternoon')}
                                style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Book Afternoon
                            </button>
                        )}
                        {!morningBooked && !afternoonBooked && (
                            <button
                                onClick={() => handleBookingSubmit(desk.id, date, 'full_day')}
                                style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Book Full Day
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

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
                                                {renderBookingSlots(desk, date)}
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