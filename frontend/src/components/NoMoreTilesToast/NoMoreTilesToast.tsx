import { useState, useEffect } from 'react';
import './NoMoreTilesToast.css';

interface NoMoreTilesToastProps {
  message: string;
  duration?: number;
  onClose?: () => void;
  position?: number;
}

function NoMoreTilesToast({ 
  message, 
  duration = 3000, 
  onClose,
  position = 0
}: NoMoreTilesToastProps) {
  const [visible, setVisible] = useState(true);
  const [animationState, setAnimationState] = useState('entering');

  useEffect(() => {
    setAnimationState('visible');
    
    const timer = setTimeout(() => {
      setAnimationState('exiting');
      setTimeout(() => {
        setVisible(false);
        if (onClose) {
          onClose();
        }
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  return (
    <div 
      className={`no-more-tiles-toast-container ${animationState}`}
      data-position={position}
    >
      <div className="no-more-tiles-toast">
        <div className="no-more-tiles-toast-square">
          !
        </div>
        <p className="no-more-tiles-toast-message">{message}</p>
        <button 
          className="no-more-tiles-toast-close" 
          onClick={() => {
            setAnimationState('exiting');
            setTimeout(() => {
              setVisible(false);
              if (onClose) {
                onClose();
              }
            }, 300);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default NoMoreTilesToast;