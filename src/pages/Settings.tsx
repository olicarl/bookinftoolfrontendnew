import { useState, useEffect, useContext, useRef } from 'preact/hooks';
import { h } from 'preact';
import { fabric } from 'fabric';
import { route } from 'preact-router';
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
            "sl-input": any;
            "sl-button": any;
            "sl-dialog": any;
            "sl-select": any;
            "sl-option": any;
        }
    }
}

interface Office {
    id: string;
    name: string;
    layout_json: string;
    created_at: string;
    desk_count?: number;
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

interface FabricObject extends fabric.Object {
    data?: {
        id: string;
        name: string;
    };
    _objects?: any[]; // For accessing group objects
}

const Settings = () => {
    const { session, setFlashMessages } = useContext(AppContext) as AppContextType;
    const [offices, setOffices] = useState<Office[]>([]);
    const [loading, setLoading] = useState(false);
    const [newOfficeName, setNewOfficeName] = useState('');
    const [invitedEmail, setInvitedEmail] = useState("");
    const [officeMapModalOpen, setOfficeMapModalOpen] = useState(false);
    const [currentOffice, setCurrentOffice] = useState<Office | null>(null);
    const [deskShapes, setDeskShapes] = useState<DeskShape[]>([]);
    const [selectedShapeId, selectShape] = useState<string | null>(null);
    const [inviteModalData, setInviteModalData] = useState<{ open: boolean, officeId: string, officeName: string }>({ open: false, officeId: '', officeName: '' });
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const canvasRef = useRef<fabric.Canvas | null>(null);
    const canvasContainerId = useRef(`office-canvas-container-${Date.now()}`);
    const [displayName, setDisplayName] = useState('');
    const dialogRef = useRef(null);
    const displayNameInputRef = useRef(null);

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
        if (!canvasRef.current || !officeMapModalOpen) return;
        
        // Calculate canvas width based on screen size
        const isMobile = window.innerWidth < 768;
        const canvasWidth = isMobile ? window.innerWidth - 40 : 800;
        const canvasHeight = isMobile ? 400 : 600;
        
        canvasRef.current.setWidth(canvasWidth);
        canvasRef.current.setHeight(canvasHeight);
        canvasRef.current.renderAll();
    };

    const fetchOffices = async () => {
        if (!session) return;
        setLoading(true);
        
        // Fetch offices with desk counts
        const { data, error } = await supabase
            .from('office_spaces')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            setFlashMessages([{ category: 'error', message: error.message }]);
            setLoading(false);
            return;
        }

        if (!data) {
            setOffices([]);
            setLoading(false);
            return;
        }

        // Get desk counts for each office
        const officesWithCounts = await Promise.all(
            data.map(async (office) => {
                const { count, error: deskCountError } = await supabase
                    .from('desks')
                    .select('*', { count: 'exact', head: true })
                    .eq('office_space_id', office.id);

                if (deskCountError) {
                    console.error('Error fetching desk count:', deskCountError);
                    return { ...office, desk_count: 0 };
                }
                return { ...office, desk_count: count || 0 };
            })
        );

        setOffices(officesWithCounts);
        setLoading(false);
    };

    useEffect(() => {
        fetchOffices();
    }, [session]);

    // Load the user's display name when the component mounts
    useEffect(() => {
        if (session?.user) {
            const currentDisplayName = session.user.user_metadata['Display name'] || '';
            setDisplayName(currentDisplayName);
        }
    }, [session]);

    const handleCreateOffice = async (e: Event) => {
        e.preventDefault();
        if (!newOfficeName.trim()) {
            setFlashMessages([{ category: 'error', message: 'Please enter an office name' }]);
            return;
        }

        setLoading(true);
        const { data: officeSpaceData, error: officeSpaceError } = await supabase
            .rpc('create_office_space_and_link_user', {
                office_space_name: newOfficeName.trim(),
                layout_json_input: '[]',
            });

        setLoading(false);
        if (officeSpaceError) {
            setFlashMessages([{ category: 'error', message: officeSpaceError.message }]);
            console.error('Error creating office space:', officeSpaceError);
            return;
        }

        if (officeSpaceData) {
            setFlashMessages([{ category: 'success', message: 'Office space created!' }]);
            setNewOfficeName('');
            fetchOffices();
        } else {
            setFlashMessages([{ category: 'error', message: 'Failed to create office space.' }]);
            console.error('Error creating office space');
        }
    };

    const openOfficeMapModal = async (office: Office) => {
        setCurrentOffice(office);
        setOfficeMapModalOpen(true);

        // Use setTimeout to ensure modal is rendered before creating canvas
        setTimeout(() => {
            try {
                const parsedLayout = JSON.parse(office.layout_json || '[]');
                if (!Array.isArray(parsedLayout)) {
                    throw new Error('Invalid layout data');
                }
                
                setDeskShapes(parsedLayout);
                
                // Clear any existing canvas container content
                const container = document.getElementById(canvasContainerId.current);
                if (container) {
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
                    if (canvasRef.current) {
                        canvasRef.current.dispose();
                    }
                    
                    canvasRef.current = new fabric.Canvas('office-canvas', {
                        width: canvasWidth,
                        height: canvasHeight,
                        backgroundColor: '#ffffff'
                    });
                    
                    // Add desks to canvas
                    parsedLayout.forEach((desk: DeskShape) => {
                        // Create the desk rectangle
                        const fabricDesk = new fabric.Rect({
                            left: 0,
                            top: 0,
                            width: desk.width,
                            height: desk.height,
                            fill: desk.fill,
                            selectable: true,
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
                            data: { id: desk.id, name: desk.name }
                        });
                        
                        if (canvasRef.current) {
                            canvasRef.current.add(group);
                        }
                    });

                    // Setup event listeners
                    canvasRef.current.on('selection:created', (e: fabric.IEvent) => {
                        const obj = e.target as FabricObject;
                        if (obj?.data?.id) {
                            selectShape(obj.data.id);
                        }
                    });
                    
                    canvasRef.current.on('selection:cleared', () => {
                        selectShape(null);
                    });
                }
            } catch (error) {
                console.error("Error rendering layout:", error);
                setFlashMessages([{ category: 'error', message: 'Error rendering office layout.' }]);
                setDeskShapes([]);
            }
        }, 200);
    };

    const closeOfficeMapModal = () => {
        if (canvasRef.current) {
            canvasRef.current.dispose();
            canvasRef.current = null;
        }
        setOfficeMapModalOpen(false);
        setCurrentOffice(null);
        setDeskShapes([]);
        selectShape(null);
        fetchOffices(); // Reload office data including desk counts
    };

    // Fixed version of the handle methods to properly manage modal state
    const handleOpenOfficeMapModal = (office: Office) => {
        // Set modal state before calling the async function
        setCurrentOffice(office);
        setOfficeMapModalOpen(true);
        // Call the actual modal content setup
        openOfficeMapModal(office);
    };

    const handleAddDeskShape = async () => {
        if (!canvasRef.current || !currentOffice) return;

        const newDesk: DeskShape = {
            id: `desk-${Date.now()}`,
            x: 50,
            y: 50,
            width: 100,
            height: 50,
            fill: 'gray',
            name: `Desk ${deskShapes.length + 1}`,
            rotation: 0
        };

        const { error } = await supabase
            .from('desks')
            .insert([{
                office_space_id: currentOffice.id,
                name: newDesk.name,
            }]);

        if (error) {
            setFlashMessages([{ category: 'error', message: error.message }]);
            console.error('Error adding desk:', error);
        } else {
            const fabricDesk = new fabric.Rect({
                left: 0,
                top: 0,
                width: newDesk.width,
                height: newDesk.height,
                fill: newDesk.fill,
                data: { id: newDesk.id, name: newDesk.name },
                selectable: true
            });

            const text = new fabric.Text(newDesk.name, {
                left: newDesk.width / 2,
                top: newDesk.height / 2,
                fontSize: 12,
                fill: 'white',
                originX: 'center',
                originY: 'center',
                selectable: false
            });

            // Create a group with the desk and its label
            const group = new fabric.Group([fabricDesk, text], {
                left: newDesk.x,
                top: newDesk.y,
                data: { id: newDesk.id, name: newDesk.name }
            });

            if (canvasRef.current) {
                canvasRef.current.add(group);
                canvasRef.current.setActiveObject(group);
            }
            
            setDeskShapes([...deskShapes, newDesk]);
            setFlashMessages([{ category: 'success', message: 'Desk added successfully!' }]);
        }
    };

    const handleDeleteDesk = async () => {
        if (!canvasRef.current || !selectedShapeId || !currentOffice) return;

        const selectedObject = canvasRef.current.getActiveObject() as FabricObject;
        if (!selectedObject || !selectedObject.data) return;

        const deskToDelete = deskShapes.find((shape) => shape.id === selectedShapeId);
        if (!deskToDelete) return;

        const { error } = await supabase
            .from('desks')
            .delete()
            .eq('office_space_id', currentOffice.id)
            .eq('name', deskToDelete.name);

        if (error) {
            setFlashMessages([{ category: 'error', message: error.message }]);
            console.error('Error deleting desk:', error);
        } else {
            canvasRef.current.remove(selectedObject);
            const updatedShapes = deskShapes.filter((shape) => shape.id !== selectedShapeId);
            setDeskShapes(updatedShapes);
            fetchOffices();
            setFlashMessages([{ category: 'success', message: 'Desk deleted successfully!' }]);
        }
    };

    const handleSaveLayout = async () => {
        if (!canvasRef.current || !currentOffice) return;

        const objects = canvasRef.current.getObjects('group') as FabricObject[];
        const updatedShapes = objects.map((group) => {
            if (!group.data) return null;
            
            // Get the rectangle inside the group (the desk)
            const items = group._objects || [];
            const rect = items.find((item: any) => item.type === 'rect');
            
            if (!rect) {
                console.warn('Could not find rectangle in group');
                return null;
            }
            
            // Get properties from both group and rect
            return {
                id: group.data.id,
                x: group.left || 0,
                y: group.top || 0,
                width: rect.width || 100,
                height: rect.height || 50,
                fill: (rect.fill as string) || 'gray',
                name: group.data.name,
                rotation: group.angle || 0
            };
        }).filter(Boolean) as DeskShape[];

        const { error } = await supabase
            .from('office_spaces')
            .update({ layout_json: JSON.stringify(updatedShapes) })
            .eq('id', currentOffice.id);

        if (error) {
            setFlashMessages([{ category: 'error', message: error.message }]);
            console.error('Error saving layout:', error);
        } else {
            setFlashMessages([{ category: 'success', message: 'Layout saved successfully!' }]);
        }
    };

    const openInviteModal = (office: Office) => {
        setInviteModalData({ open: true, officeId: office.id, officeName: office.name });
    };

    const closeInviteModal = () => {
        setInviteModalData({ open: false, officeId: '', officeName: '' });
        setInvitedEmail('');
    };

    const handleSendInvitation = async () => {
        if (!session) {
            setFlashMessages([{ category: 'error', message: "You need to be logged in to send invitations" }]);
            route("/login");
            return;
        }
        setLoading(true);

        const office = offices.find((o) => o.id === inviteModalData.officeId);
        if (!office) {
            setFlashMessages([{ category: 'error', message: 'Office not found.' }]);
            setLoading(false);
            return;
        }

        const emailContent = `
            <p>You have been invited to join the office space: ${office.name}.</p>
            <p>Click <a href="https://bookingtool.space/join-office?office_id=${office.id}">here</a> to accept the invitation and join the office space.</p>
        `;

        const { error } = await supabase.functions.invoke('send-email', {
            body: {
                from: 'oliver.keel@bookingtool.space',
                to: invitedEmail,
                subject: `Invitation to join ${office.name}`,
                html: emailContent,
            },
        });

        setLoading(false);
        if (error) {
            console.error("Error sending invitation:", error);
            setFlashMessages([{ category: 'error', message: error.message }]);
        } else {
            setFlashMessages([{ category: 'success', message: "Successfully sent invitation." }]);
            setInvitedEmail("");
            closeInviteModal();
        }
    };

    // Fixed version of the handle methods to properly manage modal state
    const handleOpenInviteModal = (office: Office) => {
        setInviteModalData({ open: true, officeId: office.id, officeName: office.name });
    };

    const handleCloseInviteModal = () => {
        closeInviteModal();
    };

    // Calculate responsive styles
    const isMobile = windowWidth < 768;

    const openDisplayNameDialog = () => {
        if (dialogRef.current) {
            dialogRef.current.show();
            // Focus the input after the dialog is shown
            setTimeout(() => {
                if (displayNameInputRef.current) {
                    displayNameInputRef.current.focus();
                }
            }, 100);
        }
    };
    
    const updateDisplayName = async () => {
        if (!session) return;
        
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.updateUser({
                data: { 'Display name': displayName }
            });
            
            if (error) {
                console.error('Error updating display name:', error);
                setFlashMessages([{ category: 'error', message: error.message }]);
            } else {
                console.log('Display name updated:', data);
                setFlashMessages([{ category: 'success', message: 'Display name updated successfully!' }]);
                if (dialogRef.current) {
                    dialogRef.current.hide();
                }
            }
        } catch (error) {
            console.error('Error updating display name:', error);
            setFlashMessages([{ category: 'error', message: 'An unexpected error occurred.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-container" style={{ 
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
                Office Management
            </h2>

            {/* Add the display name section */}
            <div className="office-form" style={{ 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span>Your display name is: <strong>{displayName || 'Not set'}</strong></span>
                    <sl-button size="small" variant="primary" onClick={openDisplayNameDialog}>
                        <sl-icon name="pencil"></sl-icon>
                    </sl-button>
                </div>
            </div>

            {/* Create new office - Fixed container and input styling */}
            <div style={{ 
                marginBottom: isMobile ? '2rem' : '3rem',
                padding: isMobile ? '1rem' : '2rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <h3 style={{ 
                    marginBottom: '1.5rem', 
                    color: '#444',
                    fontSize: isMobile ? '1.2rem' : '1.5rem',
                    textAlign: isMobile ? 'center' : 'left'
                }}>
                    Create New Office
                </h3>
                <form onSubmit={handleCreateOffice} style={{ 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: '1rem',
                    maxWidth: '100%'
                }}>
                    <input
                        type="text"
                        value={newOfficeName}
                        onChange={(e) => setNewOfficeName(e.currentTarget.value)}
                        placeholder="Enter office name"
                        style={{
                            padding: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            width: isMobile ? '100%' : '300px',
                            fontSize: '1rem',
                            maxWidth: '100%',
                            boxSizing: 'border-box'
                        }}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            transition: 'background-color 0.2s',
                            width: isMobile ? '100%' : 'auto',
                            boxSizing: 'border-box'
                        }}
                    >
                        {loading ? 'Creating...' : 'Create Office'}
                    </button>
                </form>
            </div>

            {/* Office list */}
            <div>
                <h3 style={{ 
                    marginBottom: '1.5rem', 
                    color: '#444',
                    fontSize: isMobile ? '1.2rem' : '1.5rem',
                    textAlign: isMobile ? 'center' : 'left'
                }}>
                    Your Offices
                </h3>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading offices...</div>
                ) : offices.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center',
                        padding: '2rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        color: '#666'
                    }}>
                        No offices found. Create one above!
                    </div>
                ) : (
                    <div style={{ 
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '1.5rem' 
                    }}>
                        {offices.map(office => (
                            <div 
                                key={office.id} 
                                style={{
                                    padding: '1.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid #eee',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    gap: '1rem'
                                }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>{office.name}</h4>
                                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                            Desks: {office.desk_count || 0}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                            Created: {new Date(office.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: isMobile ? 'column' : 'row',
                                        gap: '0.75rem' 
                                    }}>
                                        <button
                                            onClick={() => handleOpenOfficeMapModal(office)}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: '4px',
                                                border: 'none',
                                                backgroundColor: '#2196F3',
                                                color: 'white',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s',
                                                flex: isMobile ? 'none' : '1'
                                            }}
                                        >
                                            Edit Layout
                                        </button>
                                        <button
                                            onClick={() => handleOpenInviteModal(office)}
                                            style={{
                                                padding: '0.75rem',
                                                borderRadius: '4px',
                                                border: 'none',
                                                backgroundColor: '#9C27B0',
                                                color: 'white',
                                                cursor: 'pointer',
                                                transition: 'background-color 0.2s',
                                                flex: isMobile ? 'none' : '1'
                                            }}
                                        >
                                            Invite Users
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Office Layout Editor Modal */}
            <sl-dialog
                label={`Office Layout Editor - ${currentOffice?.name}`}
                open={officeMapModalOpen}
                onSlHide={closeOfficeMapModal}
                style={{ '--width': isMobile ? '100%' : '900px' }}
            >
                <div style={{ padding: isMobile ? '0.5rem' : '1rem' }}>
                    <div style={{ 
                        marginBottom: '1rem', 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: '0.5rem', 
                        justifyContent: 'space-between' 
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: isMobile ? 'column' : 'row',
                            gap: '0.5rem',
                            marginBottom: isMobile ? '0.5rem' : '0'
                        }}>
                            <button
                                onClick={handleAddDeskShape}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: '#4CAF50',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Add Desk
                            </button>
                            {selectedShapeId && (
                                <button
                                    onClick={handleDeleteDesk}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '4px',
                                        border: 'none',
                                        backgroundColor: '#f44336',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Delete Selected Desk
                                </button>
                            )}
                        </div>
                        <button
                            onClick={handleSaveLayout}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Save Layout
                        </button>
                    </div>
                    
                    {/* Canvas container with adaptive width */}
                    <div 
                        id={canvasContainerId.current}
                        style={{ 
                            overflow: 'auto',
                            width: '100%',
                            textAlign: 'center'
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
                            Tip: Pinch to zoom and drag to move around the canvas
                        </div>
                    )}
                </div>
            </sl-dialog>

            {/* Invite User Modal - Fixed input and button styling */}
            <sl-dialog
                label={`Invite User to ${inviteModalData.officeName}`}
                open={inviteModalData.open}
                onSlHide={handleCloseInviteModal}
                style={{ '--width': isMobile ? '90%' : 'auto' }}
            >
                <div style={{ padding: '1rem' }}>
                    <div style={{ 
                        marginBottom: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        <input
                            type="email"
                            placeholder="Enter email address"
                            value={invitedEmail}
                            onChange={(e) => setInvitedEmail(e.currentTarget.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                boxSizing: 'border-box'
                            }}
                        />
                        <button
                            onClick={handleSendInvitation}
                            disabled={!invitedEmail || loading}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                cursor: 'pointer',
                                opacity: (!invitedEmail || loading) ? 0.7 : 1,
                                boxSizing: 'border-box'
                            }}
                        >
                            {loading ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </div>
                </div>
            </sl-dialog>

            {/* Add modal dialog for editing display name */}
            <sl-dialog ref={dialogRef} label="Edit Display Name" class="dialog-overview">
                <div style={{ padding: '20px 0' }}>
                    <sl-input
                        ref={displayNameInputRef}
                        label="Display Name"
                        value={displayName}
                        onInput={(e) => setDisplayName(e.target.value)}
                        style={{ width: '100%' }}
                    ></sl-input>
                </div>
                
                <div slot="footer">
                    <sl-button variant="neutral" onClick={() => dialogRef.current.hide()}>
                        Cancel
                    </sl-button>
                    <sl-button variant="primary" onClick={updateDisplayName} loading={loading}>
                        Save
                    </sl-button>
                </div>
            </sl-dialog>
        </div>
    );
};

export default Settings; 