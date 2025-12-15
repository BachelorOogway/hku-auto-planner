import { useState } from 'react';
import { excelToCSV, excelToJSON, loadDefaultExcel } from '../utils/excelUtils';

function FileUploader({ onDataLoaded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    
    try {
      // Convert to CSV
      const csv = await excelToCSV(file);
      
      // Also get JSON format for easier processing
      const json = await excelToJSON(file);
      
      setFileName(file.name);
      onDataLoaded({ csv, json, fileName: file.name });
    } catch (err) {
      setError('Error processing file: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDefault = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use relative path that works with Vite's base configuration
      const { csv, json } = await loadDefaultExcel('./built-in-data.xlsx');
      
      setFileName('built-in-data.xlsx (default)');
      onDataLoaded({ csv, json, fileName: 'built-in-data.xlsx' });
    } catch (err) {
      setError('Error loading default file: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="file-uploader">
      <h2>Load Class Timetable</h2>
      
      <div className="upload-section">
        <button 
          onClick={handleLoadDefault} 
          disabled={loading}
          className="default-button"
        >
          {loading ? 'Loading...' : 'Use Built-in Timetable'}
        </button>
        
        <div className="divider">OR</div>
        
        <div className="file-input-wrapper">
          <label htmlFor="file-upload" className="file-label">
            Upload Your Own XLSX File
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            disabled={loading}
          />
        </div>
      </div>

      {fileName && (
        <div className="success-message">
          ✓ Loaded: {fileName}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && (
        <div className="loading-spinner">
          Processing...
        </div>
      )}
    </div>
  );
}

export default FileUploader;
