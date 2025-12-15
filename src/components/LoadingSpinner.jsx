import './LoadingSpinner.css';

function LoadingSpinner() {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="spinner"></div>
        <p>Finding possible schedules...</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;
