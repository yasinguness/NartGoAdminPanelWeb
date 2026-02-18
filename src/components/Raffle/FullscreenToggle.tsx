import React, { useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';

const FullscreenToggle: React.FC = () => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    // Listen for fullscreen changes
    React.useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    return (
        <button className="fullscreen-toggle" onClick={toggleFullscreen}>
            {isFullscreen ? (
                <>
                    <Minimize size={18} style={{ marginRight: '8px', display: 'inline' }} />
                    Normal Ekran (ESC)
                </>
            ) : (
                <>
                    <Maximize size={18} style={{ marginRight: '8px', display: 'inline' }} />
                    Tam Ekran (F11)
                </>
            )}
        </button>
    );
};

export default FullscreenToggle;
