import { useMemo } from 'react';
import './SolutionsList.css';

function SolutionsList({ solutions, selectedIndex, onSelectSolution }) {
  // Group solutions by semester
  const groupedSolutions = useMemo(() => {
    return solutions.map((solution, index) => {
      const bySemester = {};
      solution.forEach(course => {
        if (!bySemester[course.term]) {
          bySemester[course.term] = [];
        }
        bySemester[course.term].push(course);
      });
      return {
        index,
        bySemester,
        semesters: Object.keys(bySemester).sort()
      };
    });
  }, [solutions]);

  return (
    <div className="solutions-list">
      <div className="solutions-header">
        <h2>Possible Plans ({solutions.length})</h2>
      </div>
      
      <div className="solutions-content">
        {groupedSolutions.map((solution) => (
          <div
            key={solution.index}
            className={`solution-card ${selectedIndex === solution.index ? 'selected' : ''}`}
            onClick={() => onSelectSolution(solution.index)}
          >
            <h3>Plan {solution.index + 1}</h3>
            {solution.semesters.map(semester => (
              <div key={semester} className="semester-group">
                <h4>{semester}</h4>
                <ul>
                  {solution.bySemester[semester].map((course, idx) => (
                    <li key={idx}>
                      <strong>{course.courseCode}</strong> - {course.section}
                      <div className="course-title-small">{course.courseTitle}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SolutionsList;
