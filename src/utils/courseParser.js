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
 * Check if two sections have time conflicts
 */
export const hasSectionConflict = (section1Sessions, section2Sessions) => {
  for (const session1 of section1Sessions) {
    for (const session2 of section2Sessions) {
      if (hasTimeConflict(session1, session2)) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Generate all possible schedule combinations
 */
export const generateSchedules = (selectedCourses, groupedData) => {
  if (selectedCourses.length === 0) return [];
  
  // Prepare course sections data
  const coursesWithSections = selectedCourses.map(course => ({
    courseCode: course.courseCode,
    courseTitle: course.courseTitle,
    term: course.term,
    sections: course.selectedSections.map(section => ({
      section,
      sessions: groupedData[course.courseCode].sections[section]
    }))
  }));
  
  // Generate all combinations recursively
  const results = [];
  
  const generateCombinations = (index, currentSchedule) => {
    if (index === coursesWithSections.length) {
      // Check for conflicts in current schedule
      const sessions = currentSchedule.flatMap(item => item.sessions);
      let hasConflict = false;
      
      for (let i = 0; i < sessions.length - 1; i++) {
        for (let j = i + 1; j < sessions.length; j++) {
          if (hasTimeConflict(sessions[i], sessions[j])) {
            hasConflict = true;
            break;
          }
        }
        if (hasConflict) break;
      }
      
      if (!hasConflict) {
        results.push(currentSchedule);
      }
      return;
    }
    
    const course = coursesWithSections[index];
    for (const sectionData of course.sections) {
      generateCombinations(index + 1, [
        ...currentSchedule,
        {
          courseCode: course.courseCode,
          courseTitle: course.courseTitle,
          term: course.term,
          section: sectionData.section,
          sessions: sectionData.sessions
        }
      ]);
    }
  };
  
  generateCombinations(0, []);
  return results;
};

/**
 * Get date range for all sessions in a schedule
 */
export const getScheduleDateRange = (schedule) => {
  let minDate = null;
  let maxDate = null;
  
  schedule.forEach(course => {
    course.sessions.forEach(session => {
      const start = new Date(session.startDate);
      const end = new Date(session.endDate);
      
      if (!minDate || start < minDate) minDate = start;
      if (!maxDate || end > maxDate) maxDate = end;
    });
  });
  
  return { minDate, maxDate };
};

/**
 * Get week numbers for a date range
 */
export const getWeekNumbers = (minDate, maxDate) => {
  if (!minDate || !maxDate) return [];
  
  const weeks = [];
  const current = new Date(minDate);
  current.setDate(current.getDate() - current.getDay()); // Start from Sunday
  
  let weekNum = 1;
  while (current <= maxDate) {
    weeks.push({
      weekNumber: weekNum,
      startDate: new Date(current),
      endDate: new Date(current.getTime() + 6 * 24 * 60 * 60 * 1000)
    });
    current.setDate(current.getDate() + 7);
    weekNum++;
  }
  
  return weeks;
};

/**
 * Check if a session occurs in a specific week
 */
export const isSessionInWeek = (session, weekStart, weekEnd) => {
  const sessionStart = new Date(session.startDate);
  const sessionEnd = new Date(session.endDate);
  
  return sessionStart <= weekEnd && sessionEnd >= weekStart;
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
