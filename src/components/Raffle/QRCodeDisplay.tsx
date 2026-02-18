import React from 'react';

interface QRCodeDisplayProps {
    url?: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url = 'https://nartgo.net/tickets' }) => {
    return (
        <div className="qr-section">
            <div className="qr-code-wrapper">
                <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`}
                    alt="QR Code"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                />
            </div>
            <div className="qr-text">📱 Bilet Almak İçin Okut</div>
        </div>
    );
};

export default QRCodeDisplay;
