/**
 * Parse and process course data from the timetable
 */

/**
 * Check if a course code is a full year course (ends with FY)
 */
export const isFullYearCourse = (courseCode) => {
  return courseCode && courseCode.trim().endsWith('FY');
};

/**
 * Check if the term is a summer semester
 */
export const isSummerSemester = (term) => {
  return term && (term.toLowerCase().includes('summer') || term.toLowerCase().includes('sum sem'));
};

/**
 * Check if the career is undergraduate
 */
export const isUndergraduate = (career) => {
  return career === 'UG' || career === 'UGME' || career === 'UGDE';
};

/**
 * Parse time string (HH:MM:SS) to minutes from midnight
 */
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

/**
 * Format minutes to HH:MM
 */
export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Parse a single row from the CSV/JSON data
 */
export const parseClassSession = (row) => {
  return {
    term: row['TERM'],
    career: row['ACAD_CAREER'] || row[' ACAD_CAREER'],
    courseCode: row['COURSE CODE'] || row[' COURSE CODE'],
    classSection: row['CLASS SECTION'] || row[' CLASS SECTION'],
    classNumber: row['CLASS NUMBER'] || row[' CLASS NUMBER'],
    startDate: row['START DATE'] || row[' START DATE'],
    endDate: row['END DATE'] || row[' END DATE'],
    days: {
      mon: row['MON'] || row[' MON'] || '',
      tue: row['TUE'] || row[' TUE'] || '',
      wed: row['WED'] || row[' WED'] || '',
      thu: row['THU'] || row[' THU'] || '',
      fri: row['FRI'] || row[' FRI'] || '',
      sat: row['SAT'] || row[' SAT'] || '',
      sun: row['SUN'] || row[' SUN'] || '',
    },
    venue: row['VENUE'] || row[' VENUE'],
    startTime: row['START TIME'] || row[' START TIME'],
    endTime: row['END TIME'] || row[' END TIME'],
    courseTitle: row['COURSE TITLE'] || row[' COURSE TITLE'],
    offerDept: row['OFFER DEPT'] || row[' OFFER DEPT'],
    instructor: row['INSTRUCTOR'] || row[' INSTRUCTOR'],
  };
};

/**
 * Filter courses based on requirements
 */
export const filterCourses = (data) => {
  return data.filter(row => {
    const career = row['ACAD_CAREER'] || row[' ACAD_CAREER'];
    const courseCode = row['COURSE CODE'] || row[' COURSE CODE'];
    const term = row['TERM'];
    
    // Only undergraduate courses
    if (!isUndergraduate(career)) return false;
    
    // No summer semester
    if (isSummerSemester(term)) return false;
    
    // No full year courses
    if (isFullYearCourse(courseCode)) return false;
    
    return true;
  });
};

/**
 * Group sessions by course code and section
 */
export const groupByCourseAndSection = (filteredData) => {
  const grouped = {};
  
  filteredData.forEach(row => {
    const courseCode = row['COURSE CODE'] || row[' COURSE CODE'];
    const section = row['CLASS SECTION'] || row[' CLASS SECTION'];
    
    if (!courseCode) return;
    
    const key = `${courseCode}`;
    
    if (!grouped[key]) {
      grouped[key] = {
        courseCode,
        courseTitle: row['COURSE TITLE'] || row[' COURSE TITLE'],
        offerDept: row['OFFER DEPT'] || row[' OFFER DEPT'],
        term: row['TERM'],
        sections: {}
      };
    }
    
    if (!grouped[key].sections[section]) {
      grouped[key].sections[section] = [];
    }
    
    grouped[key].sections[section].push(parseClassSession(row));
  });
  
  return grouped;
};

/**
 * Get all unique courses (without duplicates)
 */
export const getUniqueCourses = (groupedData) => {
  return Object.values(groupedData).map(course => ({
    courseCode: course.courseCode,
    courseTitle: course.courseTitle,
    offerDept: course.offerDept,
    term: course.term,
    sections: Object.keys(course.sections),
    sectionCount: Object.keys(course.sections).length
  }));
};

/**
 * Check if two time slots overlap
 */
export const hasTimeConflict = (session1, session2) => {
  // Check if they share any day
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const sharedDays = days.filter(day => 
    session1.days[day] && session2.days[day]
  );
  
  if (sharedDays.length === 0) return false;
  
  // Check time overlap
  const start1 = timeToMinutes(session1.startTime);
  const end1 = timeToMinutes(session1.endTime);
  const start2 = timeToMinutes(session2.startTime);
  const end2 = timeToMinutes(session2.endTime);
  
  if (start1 === null || end1 === null || start2 === null || end2 === null) {
    return false;
  }
  
  return start1 < end2 && start2 < end1;
};

/**
 * Process raw data into structured course information
 */
export const processCoursesData = (rawData) => {
  console.log('Processing raw data, total rows:', rawData.length);
  console.log('Sample raw row:', rawData[0]);
  
  // Filter courses
  const filtered = filterCourses(rawData);
  console.log('After filtering:', filtered.length, 'rows');
  
  // Group by course and section
  const grouped = groupByCourseAndSection(filtered);
  console.log('Grouped courses:', Object.keys(grouped).length);
  
  // Get unique courses
  const courses = getUniqueCourses(grouped);
  console.log('Unique courses:', courses.length);
  
  return {
    courses: courses.sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
    grouped,
    totalCourses: courses.length,
    totalSessions: filtered.length
  };
};
