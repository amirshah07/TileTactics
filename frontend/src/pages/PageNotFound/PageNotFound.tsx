import { useNavigate } from 'react-router-dom';
import './PageNotFound.css';

function PageNotFound() {
  const navigate = useNavigate();
  
  const handleReturnHome = () => {
    navigate('/');
  };

  return (
    <div className="not-found-container">
      <h1 className="not-found-title">404 - Page Not Found</h1>
      <p className="not-found-message">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <button onClick={handleReturnHome} className="return-home-button">
        Return to Home →
      </button>
    </div>
  );
}

export default PageNotFound;