import { useState, useEffect } from 'preact/hooks';

interface FlashMessageProps {
    category: string;
    message: string;
}

const FlashMessage = ({ category, message }: FlashMessageProps) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
        }, 5000); // Hide after 5 seconds

        return () => clearTimeout(timer);
    }, []);

    const handleDismiss = () => {
        setVisible(false);
    };

    if (!visible) {
        return null; // Don't render anything if not visible
    }

    return (
        <sl-alert
            variant={category === 'error' ? 'danger' : 'success'}
            closable
            onSlAfterHide={handleDismiss}
        >
            <sl-icon
                slot="icon"
                name={category === 'error' ? 'exclamation-triangle' : 'info-circle'}
            />
            <strong>{category.charAt(0).toUpperCase() + category.slice(1)}</strong>
            <p>{message}</p>
        </sl-alert>
    );
};

export default FlashMessage; 