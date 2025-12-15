import { useState } from 'react'
import './App.css'
import FileUploader from './components/FileUploader'

function App() {
  const [courseData, setCourseData] = useState(null);

  const handleDataLoaded = (data) => {
    setCourseData(data);
    console.log('Course data loaded:', data);
    console.log('CSV preview:', data.csv.substring(0, 500));
    console.log('JSON preview:', data.json.slice(0, 5));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>HKU Course Planner</h1>
        <p>Automatically plan your semester courses</p>
      </header>

      <main className="App-main">
        <FileUploader onDataLoaded={handleDataLoaded} />
        
        {courseData && (
          <div className="data-preview">
            <h3>Data Loaded Successfully!</h3>
            <p>Total courses: {courseData.json.length}</p>
            <details>
              <summary>View CSV Preview</summary>
              <pre>{courseData.csv.substring(0, 1000)}...</pre>
            </details>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
