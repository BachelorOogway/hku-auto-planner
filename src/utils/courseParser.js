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
 * Parse time string (HH:MM:SS or HH:MM) or Date object to minutes from midnight
 */
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  
  // If it's a Date object (from Excel), extract time using UTC to avoid timezone issues
  if (timeStr instanceof Date) {
    const hours = timeStr.getUTCHours();
    const minutes = timeStr.getUTCMinutes();
    return hours * 60 + minutes;
  }
  
  // If it's a string, parse it
  const timeString = String(timeStr).trim();
  const parts = timeString.split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
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
 * Format time string to HH:MM
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return '';
  
  // If it's a Date object, format it
  if (timeStr instanceof Date) {
    const hours = timeStr.getHours();
    const minutes = timeStr.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // If it's already a string in HH:MM format, return it
  if (typeof timeStr === 'string' && timeStr.includes(':')) {
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
  }
  
  // Try to convert to minutes and back
  const minutes = timeToMinutes(timeStr);
  if (minutes === null) return String(timeStr);
  return minutesToTime(minutes);
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
    const term = row['TERM'];
    
    // Only undergraduate courses
    if (!isUndergraduate(career)) return false;
    
    // No summer semester
    if (isSummerSemester(term)) return false;
    
    // Now accepting full year courses (FY suffix)
    
    return true;
  });
};

/**
 * Group sessions by course code and section
 */
export const groupByCourseAndSection = (filteredData) => {
  const grouped = {};
  
  // First pass: group all the data
  filteredData.forEach(row => {
    const courseCode = row['COURSE CODE'] || row[' COURSE CODE'];
    const section = row['CLASS SECTION'] || row[' CLASS SECTION'];
    const term = row['TERM'];
    
    if (!courseCode) return;
    
    // Group by courseCode-term to handle courses offered in multiple semesters
    const key = `${courseCode}-${term}`;
    
    if (!grouped[key]) {
      grouped[key] = {
        courseCode,
        courseTitle: row['COURSE TITLE'] || row[' COURSE TITLE'],
        offerDept: row['OFFER DEPT'] || row[' OFFER DEPT'],
        term: term,
        sections: {}
      };
    }
    
    if (!grouped[key].sections[section]) {
      grouped[key].sections[section] = [];
    }
    
    grouped[key].sections[section].push(parseClassSession(row));
  });
  
  // Second pass: For FY courses, duplicate Sem 1 data to Sem 2 if Sem 2 doesn't exist
  // Get all available terms from the data
  const allTerms = [...new Set(filteredData.map(row => row['TERM']))].filter(t => t && !isSummerSemester(t)).sort();
  
  if (allTerms.length >= 2) {
    const term1 = allTerms[0]; // e.g., "2025-26 Sem 1"
    const term2 = allTerms[1]; // e.g., "2025-26 Sem 2"
    
    // Find all FY courses in Sem 1
    Object.keys(grouped).forEach(key => {
      const course = grouped[key];
      if (isFullYearCourse(course.courseCode) && course.term === term1) {
        const sem2Key = `${course.courseCode}-${term2}`;
        
        // If Sem 2 doesn't exist for this FY course, duplicate Sem 1 data
        if (!grouped[sem2Key]) {
          grouped[sem2Key] = {
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            offerDept: course.offerDept,
            term: term2,
            sections: {}
          };
          
          // Copy all sections and their sessions
          Object.keys(course.sections).forEach(section => {
            grouped[sem2Key].sections[section] = course.sections[section].map(session => ({
              ...session,
              term: term2
            }));
          });
          
          if (import.meta.env.DEV) {
            console.log(`Duplicated FY course ${course.courseCode} from ${term1} to ${term2} (${Object.keys(course.sections).length} sections)`);
          }
        }
      }
    });
  }
  
  return grouped;
};

/**
 * Get all unique courses with their semester offerings consolidated
 */
export const getUniqueCourses = (groupedData) => {
  const courseMap = {};
  
  Object.values(groupedData).forEach(course => {
    if (!courseMap[course.courseCode]) {
      courseMap[course.courseCode] = {
        courseCode: course.courseCode,
        courseTitle: course.courseTitle,
        offerDept: course.offerDept,
        terms: [],
        sections: Object.keys(course.sections),
        sectionCount: Object.keys(course.sections).length,
        isFY: isFullYearCourse(course.courseCode)
      };
    }
    
    // Add this term if not already present
    if (!courseMap[course.courseCode].terms.includes(course.term)) {
      courseMap[course.courseCode].terms.push(course.term);
    }
    
    // Merge sections from different semesters
    const newSections = Object.keys(course.sections);
    newSections.forEach(section => {
      if (!courseMap[course.courseCode].sections.includes(section)) {
        courseMap[course.courseCode].sections.push(section);
      }
    });
    courseMap[course.courseCode].sectionCount = courseMap[course.courseCode].sections.length;
  });
  
  return Object.values(courseMap);
};

/**
 * Check if two time slots overlap
 */
export const hasTimeConflict = (session1, session2) => {
  // Check if they share any day
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const sharedDays = days.filter(day => 
    session1.days[day] && session1.days[day].trim() !== '' && 
    session2.days[day] && session2.days[day].trim() !== ''
  );
  
  if (sharedDays.length === 0) return false;
  
  // Check time overlap
  const start1 = timeToMinutes(session1.startTime);
  const end1 = timeToMinutes(session1.endTime);
  const start2 = timeToMinutes(session2.startTime);
  const end2 = timeToMinutes(session2.endTime);
  
  if (start1 === null || end1 === null || start2 === null || end2 === null) {
    console.warn('Time parsing failed:', {
      session1: { 
        raw: { start: session1.startTime, end: session1.endTime },
        parsed: { start: start1, end: end1 }
      },
      session2: { 
        raw: { start: session2.startTime, end: session2.endTime },
        parsed: { start: start2, end: end2 }
      }
    });
    return false;
  }
  
  // Two time slots overlap if one starts before the other ends
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
 * 
 * Algorithm:
 * 1. Group courses by whether they're offered in one or both semesters
 * 2. For single-semester courses, assign to their offering semester
 * 3. Check if either semester already exceeds 6 courses from single-semester courses
 * 4. Permutate dual-semester courses across both semesters
 * 5. For each semester distribution, try all subclass combinations
 * 6. Check for time conflicts within each semester
 * 7. Filter out schedules that clash with blockouts
 */
export const generateSchedules = (selectedCourses, groupedData, availableTerms = [], blockouts = []) => {
  if (selectedCourses.length === 0) return { schedules: [], plans: [], availableTerms: [] };
  
  const MAX_COURSES_PER_SEMESTER = 6;
  
  // Determine semester identifiers from availableTerms
  // Handle case where there might be only one term or more than two
  const term1 = availableTerms[0] || 'Semester 1';
  const term2 = availableTerms[1] || availableTerms[0] || 'Semester 2';
  
  console.log('\n=== SCHEDULE GENERATION START ===');
  console.log('Total selected courses:', selectedCourses.length);
  console.log('Available terms:', availableTerms);
  console.log('Using term1:', term1, 'term2:', term2);
  
  // Step 1: Categorize courses based on which sections the user actually selected
  const onlySem1 = [];
  const onlySem2 = [];
  const bothSemesters = [];
  const fullYearCourses = [];
  
  selectedCourses.forEach(course => {
    const courseInfo = {
      code: course.courseCode,
      title: course.courseTitle,
      offerings: course.terms,
      selectedSections: course.selectedSections
    };
    
    // Check if this is a full-year course
    const isFY = isFullYearCourse(course.courseCode);
    
    if (isFY) {
      // Full-year courses must be scheduled in both semesters
      fullYearCourses.push(courseInfo);
      return;
    }
    
    // Check which semesters have the user's selected sections
    let hasValidSem1Sections = false;
    let hasValidSem2Sections = false;
    
    course.terms.forEach(term => {
      const groupKey = `${course.courseCode}-${term}`;
      if (groupedData[groupKey]) {
        const availableSections = course.selectedSections.filter(
          section => groupedData[groupKey].sections[section] !== undefined
        );
        
        if (availableSections.length > 0) {
          if (term === term1) {
            hasValidSem1Sections = true;
          } else if (term === term2) {
            hasValidSem2Sections = true;
          }
        }
      }
    });
    
    // Categorize based on where user's selected sections actually exist
    if (hasValidSem1Sections && hasValidSem2Sections) {
      bothSemesters.push(courseInfo);
    } else if (hasValidSem1Sections) {
      onlySem1.push(courseInfo);
    } else if (hasValidSem2Sections) {
      onlySem2.push(courseInfo);
    } else {
      console.error(`No valid sections found for ${course.courseCode} in any semester`);
    }
  });
  
  if (import.meta.env.DEV) {
    console.log('Full Year Courses:', fullYearCourses.map(c => c.code).join(', '));
    console.log('Only Sem 1 (based on selected sections):', onlySem1.map(c => c.code).join(', '));
    console.log('Only Sem 2 (based on selected sections):', onlySem2.map(c => c.code).join(', '));
    console.log('Both Semesters (based on selected sections):', bothSemesters.map(c => c.code).join(', '));
  }
  
  // Step 2: Check if single-semester courses already exceed limit
  // FY courses occupy one slot in each semester
  const fyCount = fullYearCourses.length;
  
  if (onlySem1.length + fyCount > MAX_COURSES_PER_SEMESTER) {
    console.error(`❌ IMPOSSIBLE: ${onlySem1.length} sem1-only + ${fyCount} FY courses exceed limit of ${MAX_COURSES_PER_SEMESTER}`);
    console.error('   Courses:', [...fullYearCourses, ...onlySem1].map(c => c.code).join(', '));
    return [];
  }
  if (onlySem2.length + fyCount > MAX_COURSES_PER_SEMESTER) {
    console.error(`❌ IMPOSSIBLE: ${onlySem2.length} sem2-only + ${fyCount} FY courses exceed limit of ${MAX_COURSES_PER_SEMESTER}`);
    console.error('   Courses:', [...fullYearCourses, ...onlySem2].map(c => c.code).join(', '));
    return [];
  }
  
  const sem1Slots = MAX_COURSES_PER_SEMESTER - onlySem1.length - fyCount;
  const sem2Slots = MAX_COURSES_PER_SEMESTER - onlySem2.length - fyCount;
  
  if (import.meta.env.DEV) {
    console.log(`Full Year: ${fyCount} courses (occupy slots in both semesters)`);
    console.log(`Sem 1: ${fyCount} FY + ${onlySem1.length} fixed = ${fyCount + onlySem1.length}, ${sem1Slots} slots remaining`);
    console.log(`Sem 2: ${fyCount} FY + ${onlySem2.length} fixed = ${fyCount + onlySem2.length}, ${sem2Slots} slots remaining`);
  }
  
  if (bothSemesters.length > sem1Slots + sem2Slots) {
    console.error(`❌ IMPOSSIBLE: ${bothSemesters.length} flexible courses need ${bothSemesters.length} slots, but only ${sem1Slots + sem2Slots} slots available`);
    return [];
  }
  
  // Step 3: Generate all valid distributions of bothSemesters courses
  const results = [];
  let distributionsTested = 0;
  let subclassCombinationsTested = 0;
  let conflictRejections = 0;
  
  // Generate all ways to distribute bothSemesters courses into sem1 and sem2
  const generateDistributions = (index, sem1Assignments, sem2Assignments) => {
    if (index === bothSemesters.length) {
      // Check if this distribution is valid
      if (sem1Assignments.length <= sem1Slots && sem2Assignments.length <= sem2Slots) {
        distributionsTested++;
        
        // Now we have a valid distribution, try all subclass combinations
        trySubclassCombinations(
          [...onlySem1, ...sem1Assignments],
          [...onlySem2, ...sem2Assignments]
        );
      }
      return;
    }
    
    const course = bothSemesters[index];
    
    // Try assigning to Sem 1
    if (sem1Assignments.length < sem1Slots) {
      generateDistributions(index + 1, [...sem1Assignments, course], sem2Assignments);
    }
    
    // Try assigning to Sem 2
    if (sem2Assignments.length < sem2Slots) {
      generateDistributions(index + 1, sem1Assignments, [...sem2Assignments, course]);
    }
  };
  
  // For a given distribution, try all subclass combinations
  const trySubclassCombinations = (sem1Courses, sem2Courses) => {
    // Add FY courses to both semesters
    const sem1CoursesWithFY = [...fullYearCourses, ...sem1Courses];
    const sem2CoursesWithFY = [...fullYearCourses, ...sem2Courses];
    
    if (import.meta.env.DEV && fullYearCourses.length > 0) {
      console.log('FY courses being added to schedules:', fullYearCourses.map(c => c.code));
      fullYearCourses.forEach(fyCourse => {
        const key1 = `${fyCourse.code}-${term1}`;
        const key2 = `${fyCourse.code}-${term2}`;
        console.log(`Checking FY course ${fyCourse.code}:`, {
          key1,
          existsInSem1: !!groupedData[key1],
          key2,
          existsInSem2: !!groupedData[key2],
          sections1: groupedData[key1] ? Object.keys(groupedData[key1].sections) : [],
          sections2: groupedData[key2] ? Object.keys(groupedData[key2].sections) : []
        });
      });
    }
    
    // Prepare course-section data for each semester
    const prepareSemesterCourses = (courses, targetSemester) => {
      const validCourses = [];
      
      courses.forEach(course => {
        // Look up session data using courseCode-term key
        const groupKey = `${course.code}-${targetSemester}`;
        
        if (!groupedData[groupKey]) {
          console.warn(`Course ${course.code} not offered in ${targetSemester}, skipping`);
          return;
        }
        
        // Filter to only include sections that the user selected AND exist in this semester
        const availableSections = course.selectedSections
          .filter(section => groupedData[groupKey].sections[section] !== undefined)
          .map(section => ({
            section,
            sessions: groupedData[groupKey].sections[section]
          }));
        
        if (availableSections.length === 0) {
          console.warn(`None of the selected sections for ${course.code} are available in ${targetSemester}, skipping this course for this semester`);
          return;
        }
        
        validCourses.push({
          courseCode: course.code,
          courseTitle: course.title,
          term: targetSemester,
          sections: availableSections
        });
      });
      
      return validCourses;
    };
    
    const sem1CoursesWithSections = prepareSemesterCourses(sem1CoursesWithFY, term1);
    const sem2CoursesWithSections = prepareSemesterCourses(sem2CoursesWithFY, term2);
    
    // Generate all subclass combinations for a semester
    const generateSemesterCombinations = (courses, semesterName, semesterBlockouts) => {
      const combinations = [];
      
      const generate = (index, currentSchedule) => {
        if (index === courses.length) {
          subclassCombinationsTested++;
          
          // Check for time conflicts within this semester
          let hasConflict = false;
          
          for (let i = 0; i < currentSchedule.length - 1; i++) {
            for (let j = i + 1; j < currentSchedule.length; j++) {
              for (const session1 of currentSchedule[i].sessions) {
                for (const session2 of currentSchedule[j].sessions) {
                  if (hasTimeConflict(session1, session2)) {
                    hasConflict = true;
                    conflictRejections++;
                    break;
                  }
                }
                if (hasConflict) break;
              }
              if (hasConflict) break;
            }
            if (hasConflict) break;
          }
          
          // Check for blockout conflicts in this semester
          if (!hasConflict && semesterBlockouts.length > 0) {
            for (const courseItem of currentSchedule) {
              for (const session of courseItem.sessions) {
                for (const blockout of semesterBlockouts) {
                  // Check if session day matches blockout day
                  const dayKey = blockout.day;
                  if (session.days[dayKey] && session.days[dayKey].trim() !== '') {
                    // Parse blockout times
                    const blockoutStart = timeToMinutes(blockout.startTime);
                    const blockoutEnd = timeToMinutes(blockout.endTime);
                    const sessionStart = timeToMinutes(session.startTime);
                    const sessionEnd = timeToMinutes(session.endTime);
                    
                    // Check for time overlap
                    if (sessionStart < blockoutEnd && blockoutStart < sessionEnd) {
                      hasConflict = true;
                      break;
                    }
                  }
                }
                if (hasConflict) break;
              }
              if (hasConflict) break;
            }
          }
          
          if (!hasConflict) {
            combinations.push(currentSchedule);
          }
          return;
        }
        
        const course = courses[index];
        for (const sectionData of course.sections) {
          if (!sectionData || !sectionData.sessions) {
            if (import.meta.env.DEV) {
              console.error('Invalid section data:', { course: course.courseCode, sectionData });
            }
            continue;
          }
          generate(index + 1, [
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
      
      if (courses.length > 0) {
        generate(0, []);
      } else {
        combinations.push([]);
      }
      
      return combinations;
    };
    
    // Filter blockouts for each semester
    // Default to 'both' for blockouts without applyTo field (backwards compatibility)
    const sem1Blockouts = blockouts.filter(b => !b.applyTo || b.applyTo === 'both' || b.applyTo === 'sem1');
    const sem2Blockouts = blockouts.filter(b => !b.applyTo || b.applyTo === 'both' || b.applyTo === 'sem2');
    
    if (import.meta.env.DEV) {
      console.log(`Blockouts: ${sem1Blockouts.length} for Sem 1, ${sem2Blockouts.length} for Sem 2`);
    }
    
    const sem1Combinations = generateSemesterCombinations(sem1CoursesWithSections, 'Sem 1', sem1Blockouts);
    const sem2Combinations = generateSemesterCombinations(sem2CoursesWithSections, 'Sem 2', sem2Blockouts);
    
    // Combine Sem 1 and Sem 2 schedules into complete plans
    // For FY courses, ensure the same section is used in both semesters
    sem1Combinations.forEach(sem1Schedule => {
      sem2Combinations.forEach(sem2Schedule => {
        // Check if FY courses use matching sections
        let fyCoursesMatch = true;
        
        fullYearCourses.forEach(fyCourse => {
          const sem1Entry = sem1Schedule.find(c => c.courseCode === fyCourse.code);
          const sem2Entry = sem2Schedule.find(c => c.courseCode === fyCourse.code);
          
          if (sem1Entry && sem2Entry && sem1Entry.section !== sem2Entry.section) {
            fyCoursesMatch = false;
          }
        });
        
        if (fyCoursesMatch) {
          const fullSchedule = [...sem1Schedule, ...sem2Schedule];
          results.push(fullSchedule);
        }
      });
    });
  };
  
  // Start the generation process
  generateDistributions(0, [], []);
  
  if (import.meta.env.DEV) {
    console.log('\n=== SCHEDULE GENERATION COMPLETE ===');
    console.log('Statistics:', {
      distributionsTested,
      subclassCombinationsTested,
      conflictRejections,
      validSchedules: results.length
    });
  }
  
  // Filter out schedules that don't include all selected courses
  const expectedCourseCount = selectedCourses.length;
  const completeSchedules = results.filter(schedule => {
    const uniqueCourses = new Set(schedule.map(item => item.courseCode));
    return uniqueCourses.size === expectedCourseCount;
  });
  
  if (import.meta.env.DEV && completeSchedules.length < results.length) {
    console.log(`Filtered out ${results.length - completeSchedules.length} incomplete schedules`);
  }
  
  if (completeSchedules.length === 0) {
    if (import.meta.env.DEV) {
      console.error('❌ No valid schedules found!');
      if (results.length > 0) {
        console.error('All generated schedules were missing some courses. This may be because some courses have no valid sections in certain semesters.');
      } else {
        console.error('This means all subclass combinations had time conflicts.');
      }
    }
  } else if (import.meta.env.DEV) {
    console.log(`✅ Found ${completeSchedules.length} complete schedule(s)`);
    console.log('First schedule:', completeSchedules[0].map(c => `${c.courseCode}-${c.section} (${c.term})`).join(', '));
  }
  
  // Sort schedules to prioritize balanced schedules
  completeSchedules.sort((a, b) => {
    const getSemesterCounts = (schedule) => {
      const counts = {};
      schedule.forEach(item => {
        counts[item.term] = (counts[item.term] || 0) + 1;
      });
      return Object.values(counts).sort((x, y) => x - y);
    };
    
    const countsA = getSemesterCounts(a);
    const countsB = getSemesterCounts(b);
    
    const variance = (counts) => {
      const mean = counts.reduce((sum, c) => sum + c, 0) / counts.length;
      return counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length;
    };
    
    return variance(countsA) - variance(countsB);
  });
  
  // Calculate semester course counts for each plan
  const plansWithCounts = completeSchedules.map(schedule => {
    const sem1Count = schedule.filter(c => c.term === term1).length;
    const sem2Count = schedule.filter(c => c.term === term2).length;
    
    // Count unique courses (FY courses appear in both semesters but should count as 1)
    const uniqueCourses = new Set(schedule.map(c => c.courseCode));
    
    return {
      courses: schedule,
      sem1Count,
      sem2Count,
      totalUniqueCourses: uniqueCourses.size
    };
  });
  
  return {
    schedules: completeSchedules,
    plans: plansWithCounts,
    availableTerms: availableTerms.length > 0 ? availableTerms : [term1, term2].filter((t, i, arr) => arr.indexOf(t) === i)
  };
};

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
  if (import.meta.env.DEV) {
    console.log('Processing raw data, total rows:', rawData.length);
    console.log('Sample raw row:', rawData[0]);
  }
  
  // Filter courses
  const filtered = filterCourses(rawData);
  console.log('After filtering:', filtered.length, 'rows');
  
  // Group by course and section
  const grouped = groupByCourseAndSection(filtered);
  console.log('Grouped courses:', Object.keys(grouped).length);
  
  // Get unique courses
  const courses = getUniqueCourses(grouped);
  console.log('Unique courses:', courses.length);
  
  // Extract all unique terms from the data
  const termsSet = new Set();
  filtered.forEach(row => {
    const term = row['TERM'];
    if (term) termsSet.add(term);
  });
  const availableTerms = Array.from(termsSet).sort();
  console.log('Available terms:', availableTerms);
  
  return {
    courses: courses.sort((a, b) => a.courseCode.localeCompare(b.courseCode)),
    grouped,
    totalCourses: courses.length,
    totalSessions: filtered.length,
    availableTerms
  };
};
