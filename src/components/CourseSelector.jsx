import { useState } from 'react';
import './CourseSelector.css';

function CourseSelector({ coursesData, selectedCourses, onCourseSelect, onCourseRemove }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCourse, setExpandedCourse] = useState(null);

  // Filter courses based on search (course code only)
  const filteredCourses = coursesData.courses.filter(course => {
    const searchLower = searchTerm.toLowerCase();
    return course.courseCode.toLowerCase().includes(searchLower);
  });

  const handleCourseClick = (course) => {
    if (expandedCourse?.courseCode === course.courseCode) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(course);
    }
  };

  const handleSectionSelection = (course, section, mode) => {
    const isSelectedCourse = selectedCourses.find(c => c.courseCode === course.courseCode);
    
    if (mode === 'any') {
      // Select all sections (let system choose)
      onCourseSelect(course, course.sections);
    } else {
      // Toggle specific section
      let newSections;
      if (isSelectedCourse) {
        const currentSections = Array.isArray(isSelectedCourse.selectedSections) 
          ? isSelectedCourse.selectedSections 
          : [];
        
        if (currentSections.includes(section)) {
          // Remove this section
          newSections = currentSections.filter(s => s !== section);
          if (newSections.length === 0) {
            onCourseRemove(course.courseCode);
            return;
          }
        } else {
          // Add this section
          newSections = [...currentSections, section];
        }
      } else {
        // First selection
        newSections = [section];
      }
      
      onCourseSelect(course, newSections);
    }
  };

  const isSelected = (courseCode) => {
    return selectedCourses.find(c => c.courseCode === courseCode);
  };

  const isSectionSelected = (courseCode, section) => {
    const selected = selectedCourses.find(c => c.courseCode === courseCode);
    if (!selected) return false;
    if (!Array.isArray(selected.selectedSections)) return false;
    return selected.selectedSections.includes(section);
  };

  return (
    <div className="course-selector">
      <div className="selector-header">
        <h2>Select Your Courses</h2>
        <p className="info-text">
          Showing {coursesData.totalCourses} undergraduate courses (Sem 1 & 2 only, excluding FY courses)
        </p>
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search by course code (e.g., COMP1234, ECON)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="selected-courses-summary">
        <h3>Selected Courses: {selectedCourses.length}</h3>
        {selectedCourses.length > 0 && (
          <div className="selected-list">
            {selectedCourses.map(course => (
              <div key={course.courseCode} className="selected-item">
                <span className="selected-code">{course.courseCode}</span>
                <span className="selected-section">
                  {Array.isArray(course.selectedSections) 
                    ? course.selectedSections.length === course.sections?.length
                      ? '(All sections)'
                      : `Sections: ${course.selectedSections.join(', ')}`
                    : 'Unknown'}
                </span>
                <button
                  onClick={() => onCourseRemove(course.courseCode)}
                  className="remove-btn"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="courses-list">
        {filteredCourses.map(course => {
          const selected = isSelected(course.courseCode);
          const isExpanded = expandedCourse?.courseCode === course.courseCode;

          return (
            <div
              key={course.courseCode}
              className={`course-item ${selected ? 'selected' : ''}`}
            >
              <div
                className="course-header"
                onClick={() => handleCourseClick(course)}
              >
                <div className="course-main-info">
                  <span className="course-code">{course.courseCode}</span>
                  <span className="course-title">{course.courseTitle}</span>
                </div>
                <div className="course-meta">
                  <span className="course-dept">{course.offerDept}</span>
                  <span className="section-count">{course.sectionCount} section(s)</span>
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="course-details">
                  <div className="section-selector">
                    <h4>Select Sections (can choose multiple):</h4>
                    <div className="section-options">
                      <button
                        className={`section-btn ${selected && Array.isArray(selected.selectedSections) && selected.selectedSections.length === course.sections.length ? 'active' : ''}`}
                        onClick={() => handleSectionSelection(course, null, 'any')}
                      >
                        All Sections
                      </button>
                      {course.sections.map(section => {
                        const sectionData = coursesData.grouped[course.courseCode]?.sections[section];
                        const instructors = sectionData 
                          ? [...new Set(sectionData.map(s => s.instructor).filter(i => i))]
                          : [];
                        
                        return (
                          <button
                            key={section}
                            className={`section-btn ${isSectionSelected(course.courseCode, section) ? 'active' : ''}`}
                            onClick={() => handleSectionSelection(course, section, 'specific')}
                          >
                            <div className="section-btn-content">
                              <span className="section-name">Section {section}</span>
                              {instructors.length > 0 && (
                                <span className="section-instructor">{instructors.join(', ')}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="term-info">
                    <strong>Term:</strong> {course.term}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="no-results">
            No courses found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseSelector;
