import { useState } from 'react'
import './App.css'
import FileUploader from './components/FileUploader'
import CourseSelector from './components/CourseSelector'
import LoadingSpinner from './components/LoadingSpinner'
import SolutionsList from './components/SolutionsList'
import WeeklyTimetable from './components/WeeklyTimetable'
import { processCoursesData, generateSchedules } from './utils/courseParser'

function App() {
  const [courseData, setCourseData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [solutions, setSolutions] = useState(null);
  const [selectedSolutionIndex, setSelectedSolutionIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDataLoaded = (data) => {
    setCourseData(data);
    
    console.log('Raw data sample:', data.json.slice(0, 3));
    
    // Process the data
    const processed = processCoursesData(data.json);
    setProcessedData(processed);
    
    console.log('Course data loaded and processed');
    console.log('Total courses:', processed.totalCourses);
    console.log('Total sessions:', processed.totalSessions);
    console.log('Sample courses:', processed.courses.slice(0, 10));
    console.log('All course codes:', processed.courses.map(c => c.courseCode));
  };

  const handleCourseSelect = (course, selectedSections) => {
    setSelectedCourses(prev => {
      // Remove if already exists
      const filtered = prev.filter(c => c.courseCode !== course.courseCode);
      // Add with new sections
      return [...filtered, { ...course, selectedSections }];
    });
    setErrorMessage(''); // Clear error when user makes changes
  };

  const handleCourseRemove = (courseCode) => {
    setSelectedCourses(prev => prev.filter(c => c.courseCode !== courseCode));
    setErrorMessage(''); // Clear error when user makes changes
  };

  const handleSolve = () => {
    if (selectedCourses.length === 0) {
      setErrorMessage('Please select at least one course.');
      return;
    }

    // Check if all courses have at least one section selected
    const coursesWithoutSections = selectedCourses.filter(c => !c.selectedSections || c.selectedSections.length === 0);
    if (coursesWithoutSections.length > 0) {
      setErrorMessage('Please select at least one section for each course.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    // Use setTimeout to allow UI to update with loading spinner
    setTimeout(() => {
      try {
        const schedules = generateSchedules(selectedCourses, processedData.grouped);
        
        if (schedules.length === 0) {
          setErrorMessage(
            'No possible schedule found with the selected courses and sections. ' +
            'Please try selecting more sections or changing your course selection.'
          );
          setSolutions(null);
        } else {
          setSolutions(schedules);
          setSelectedSolutionIndex(0);
          setErrorMessage('');
        }
      } catch (error) {
        console.error('Error generating schedules:', error);
        setErrorMessage('An error occurred while generating schedules. Please try again.');
        setSolutions(null);
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };

  const handleBackToSearch = () => {
    setSolutions(null);
    setSelectedSolutionIndex(0);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>HKU Course Planner</h1>
      </header>

      <main className="App-main">
        {!courseData && <FileUploader onDataLoaded={handleDataLoaded} />}
        
        {processedData && !solutions && (
          <>
            <CourseSelector
              coursesData={processedData}
              selectedCourses={selectedCourses}
              onCourseSelect={handleCourseSelect}
              onCourseRemove={handleCourseRemove}
            />
            {errorMessage && (
              <div className="error-message">
                <strong>Error:</strong> {errorMessage}
              </div>
            )}
          </>
        )}

        {solutions && (
          <div className="solutions-view">
            <SolutionsList
              solutions={solutions}
              selectedIndex={selectedSolutionIndex}
              onSelectSolution={setSelectedSolutionIndex}
            />
            <WeeklyTimetable schedule={solutions[selectedSolutionIndex]} />
          </div>
        )}
      </main>

      {processedData && !solutions && (
        <footer className="App-footer">
          <button className="solve-button" onClick={handleSolve}>
            Solve
          </button>
        </footer>
      )}

      {solutions && (
        <footer className="App-footer">
          <button className="back-button" onClick={handleBackToSearch}>
            ← Back to Search
          </button>
        </footer>
      )}

      {isLoading && <LoadingSpinner />}
    </div>
  )
}

export default App
