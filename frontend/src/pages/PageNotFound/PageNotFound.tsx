import './PageNotFound.css';

function PageNotFound() {
  return (
    <div className="not-found-container">
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <a href="/">Return to Home</a>
    </div>
  );
}

export default PageNotFound;