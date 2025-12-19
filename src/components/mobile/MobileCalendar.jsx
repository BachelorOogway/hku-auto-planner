import { useState, useMemo, useRef, useEffect } from 'react';
import { getScheduleDateRange, getWeekNumbers, isSessionInWeek, timeToMinutes, formatTime } from '../../utils/courseParser';
import './MobileCalendar.css';

function MobileCalendar({ schedule, blockouts, onExport }) {
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0);
  const gridRef = useRef(null);

  // Filter schedule by selected semester and only include courses with valid sessions
  const semesterSchedule = useMemo(() => {
    return schedule.filter(course => {
      if (!selectedSemester) return true;
      if (course.term !== selectedSemester) return false;
      if (!course.sessions || course.sessions.length === 0) return false;
      
      const hasValidSession = course.sessions.some(session => {
        const hasValidTimes = session.startTime && session.endTime && 
                             (typeof session.startTime !== 'string' || session.startTime.trim() !== '') && 
                             (typeof session.endTime !== 'string' || session.endTime.trim() !== '');
        return hasValidTimes;
      });
      
      return hasValidSession;
    });
  }, [schedule, selectedSemester]);

  // Get available semesters
  const availableSemesters = useMemo(() => {
    const semesters = new Set(schedule.map(course => course.term));
    return Array.from(semesters).sort();
  }, [schedule]);

  // Auto-select first semester
  useMemo(() => {
    if (!selectedSemester && availableSemesters.length > 0) {
      setSelectedSemester(availableSemesters[0]);
    }
  }, [availableSemesters, selectedSemester]);

  const { weeks, dateRange } = useMemo(() => {
    const range = getScheduleDateRange(semesterSchedule);
    const weekList = getWeekNumbers(range.minDate, range.maxDate);
    return { weeks: weekList, dateRange: range };
  }, [semesterSchedule]);

  const currentWeek = weeks[currentWeekIndex];

  // Get sessions for current week
  const weekSessions = useMemo(() => {
    if (!currentWeek) return [];
    
    const sessions = [];
    
    semesterSchedule.forEach(course => {
      if (!course.sessions) return;
      
      course.sessions.forEach(session => {
        const hasValidDates = session.startDate && session.endDate && 
                             (typeof session.startDate !== 'string' || session.startDate.trim() !== '') && 
                             (typeof session.endDate !== 'string' || session.endDate.trim() !== '');
        const hasValidTimes = session.startTime && session.endTime && 
                             (typeof session.startTime !== 'string' || session.startTime.trim() !== '') && 
                             (typeof session.endTime !== 'string' || session.endTime.trim() !== '');
        
        if (!hasValidDates || !hasValidTimes) {
          return;
        }
        
        if (isSessionInWeek(session, currentWeek.startDate, currentWeek.endDate)) {
          sessions.push({
            ...session,
            courseCode: course.courseCode,
            section: course.section
          });
        }
      });
    });
    
    return sessions;
  }, [semesterSchedule, currentWeek]);

  // Calculate time range and organize by day
  const timetableData = useMemo(() => {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    
    let minTime = Infinity;
    let maxTime = -Infinity;

    weekSessions.forEach(session => {
      const start = timeToMinutes(session.startTime);
      const end = timeToMinutes(session.endTime);
      if (start < minTime) minTime = start;
      if (end > maxTime) maxTime = end;
    });

    blockouts.forEach(blockout => {
      const start = timeToMinutes(blockout.startTime);
      const end = timeToMinutes(blockout.endTime);
      if (start < minTime) minTime = start;
      if (end > maxTime) maxTime = end;
    });

    if (!isFinite(minTime) || !isFinite(maxTime)) {
      minTime = 8 * 60;
      maxTime = 19 * 60;
    } else {
      minTime = Math.floor(minTime / 60) * 60 - 60;
      maxTime = Math.ceil(maxTime / 60) * 60 + 60;
      
      if (minTime < 0) minTime = 0;
      if (maxTime > 24 * 60) maxTime = 24 * 60;
    }

    const hours = [];
    for (let h = minTime; h < maxTime; h += 60) {
      hours.push(h);
    }

    const byDay = {};
    days.forEach(day => {
      byDay[day] = weekSessions.filter(s => s.days && s.days[day] && s.days[day].trim() !== '');
    });

    return { days, dayLabels, hours, byDay, minTime, maxTime };
  }, [weekSessions, blockouts]);

  const formatTimeLabel = (minutes) => {
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:00`;
  };

  const formatDateRange = (week) => {
    const start = week.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = week.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  const goToPreviousWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };

  const goToNextWeek = () => {
    if (currentWeekIndex < weeks.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };

  if (!currentWeek) {
    return (
      <div className="mobile-calendar">
        <div className="mobile-calendar-header">
          <h2>Weekly Timetable</h2>
          <p>No schedule data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-calendar">
      <div className="mobile-calendar-header">
        <div className="mobile-calendar-top">
          <h2>Weekly Timetable</h2>
          {onExport && (
            <button className="mobile-export-btn" onClick={onExport}>
              Export
            </button>
          )}
        </div>
        
        <div className="mobile-semester-selector">
          {availableSemesters.map((semester) => (
            <button
              key={semester}
              className={`mobile-semester-btn ${selectedSemester === semester ? 'active' : ''}`}
              onClick={() => {
                setSelectedSemester(semester);
                setCurrentWeekIndex(0);
              }}
            >
              {semester.replace(/^\d{4}-\d{2}\s*/, '')}
            </button>
          ))}
        </div>
        
        <div className="mobile-week-navigation">
          <button 
            onClick={goToPreviousWeek} 
            disabled={currentWeekIndex === 0}
            className="mobile-nav-button"
          >
            ← Previous
          </button>
          <span className="mobile-week-info">
            Week {currentWeek.weekNumber} of {weeks.length}
            <br />
            <span className="mobile-date-range">{formatDateRange(currentWeek)}</span>
          </span>
          <button 
            onClick={goToNextWeek} 
            disabled={currentWeekIndex === weeks.length - 1}
            className="mobile-nav-button"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="mobile-timetable-container" ref={gridRef}>
        <div className="mobile-timetable-grid">
          {/* Sticky day headers */}
          <div className="mobile-day-headers">
            <div className="mobile-day-header-spacer"></div>
            {timetableData.dayLabels.map((label, idx) => (
              <div key={idx} className="mobile-day-header">{label}</div>
            ))}
          </div>

          {/* Time column and day columns */}
          <div className="mobile-grid-content">
            <div className="mobile-time-column">
              {timetableData.hours.map(hour => (
                <div key={hour} className="mobile-time-slot">
                  {formatTimeLabel(hour)}
                </div>
              ))}
            </div>

            {timetableData.days.map((day, dayIndex) => {
              const totalHeight = timetableData.hours.length * 60;
              
              const dayBlockouts = blockouts.filter(b => {
                if (b.day !== day) return false;
                if (b.applyTo === 'both') return true;
                const semNum = selectedSemester.toLowerCase().replace(/.*sem /, 'sem');
                return b.applyTo === semNum;
              });
              
              return (
                <div key={day} className="mobile-day-column">
                  <div className="mobile-day-slots" style={{ height: `${totalHeight}px` }}>
                    {/* Render blockouts */}
                    {dayBlockouts.map((blockout, idx) => {
                      const start = timeToMinutes(blockout.startTime);
                      const end = timeToMinutes(blockout.endTime);
                      
                      const top = ((start - timetableData.minTime) / 60) * 60;
                      const height = ((end - start) / 60) * 60;

                      return (
                        <div
                          key={`blockout-${idx}`}
                          className="mobile-session-block mobile-blockout-block"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            zIndex: 0
                          }}
                        >
                          <div className="mobile-session-code">{blockout.name}</div>
                          <div className="mobile-session-time">
                            {blockout.startTime} - {blockout.endTime}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Render course sessions */}
                    {timetableData.byDay[day].map((session, idx) => {
                      const start = timeToMinutes(session.startTime);
                      const end = timeToMinutes(session.endTime);
                      
                      const roundToNearest30 = (minutes) => Math.round(minutes / 30) * 30;
                      const roundedStart = roundToNearest30(start);
                      const roundedEnd = roundToNearest30(end);
                      
                      const top = ((roundedStart - timetableData.minTime) / 60) * 60;
                      const height = ((roundedEnd - roundedStart) / 60) * 60;

                      return (
                        <div
                          key={idx}
                          className="mobile-session-block"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`
                          }}
                        >
                          <div className="mobile-session-code">
                            {session.courseCode} {session.section}
                          </div>
                          <div className="mobile-session-time">
                            {session.startTime} - {session.endTime}
                          </div>
                          {session.room && (
                            <div className="mobile-session-room">{session.room}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileCalendar;

    if (minTime === Infinity) {
      minTime = 8 * 60;
      maxTime = 19 * 60;
    } else {
      minTime = Math.floor(minTime / 60) * 60;
      maxTime = Math.ceil(maxTime / 60) * 60;
    }

    const timeSlots = [];
    for (let time = minTime; time < maxTime; time += 60) {
      timeSlots.push(time);
    }

    return { timeSlots, minTime, maxTime };
  }, [weekSessions, blockouts]);

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri'];

  return (
    <div className="mobile-calendar">
      {/* Semester Selector */}
      {availableSemesters.length > 1 && (
        <div className="mobile-calendar-controls">
          <div className="mobile-semester-tabs">
            {availableSemesters.map((sem) => (
              <button
                key={sem}
                className={`mobile-semester-tab ${selectedSemester === sem ? 'active' : ''}`}
                onClick={() => {
                  setSelectedSemester(sem);
                  setCurrentWeekIndex(0);
                }}
              >
                {sem.replace(/^\d{4}-\d{2}\s*/, '')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Week Navigation */}
      <div className="mobile-week-nav">
        <button
          className="mobile-week-btn"
          onClick={() => setCurrentWeekIndex(prev => Math.max(0, prev - 1))}
          disabled={currentWeekIndex === 0}
        >
          ‹
        </button>
        <div className="mobile-week-info">
          <div className="mobile-week-number">Week {currentWeek?.weekNumber}</div>
          <div className="mobile-week-dates">
            {currentWeek && `${currentWeek.startDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} - ${currentWeek.endDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`}
          </div>
        </div>
        <button
          className="mobile-week-btn"
          onClick={() => setCurrentWeekIndex(prev => Math.min(weeks.length - 1, prev + 1))}
          disabled={currentWeekIndex === weeks.length - 1}
        >
          ›
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="mobile-calendar-grid">
        {weekdays.map((day, dayIndex) => {
          const dayKey = dayKeys[dayIndex];
          const daySessions = weekSessions.filter(session => session.days && session.days[dayKey]);
          
          // Filter blockouts for current day and semester
          const dayBlockouts = blockouts.filter(b => {
            // Check if blockout applies to current semester
            const semesterMatch = b.applyTo === 'both' || 
                                 (b.applyTo === 'sem1' && selectedSemester?.includes('Semester 1')) ||
                                 (b.applyTo === 'sem2' && selectedSemester?.includes('Semester 2'));
            
            // Check if blockout is for current day
            const dayMatch = b.day === dayKey;
            
            return semesterMatch && dayMatch;
          });

          return (
            <div key={day} className="mobile-day-column">
              <h3 className="mobile-day-header">{day}</h3>
              <div className="mobile-day-content">
                {daySessions.length === 0 && dayBlockouts.length === 0 ? (
                  <div className="mobile-no-classes">No classes</div>
                ) : (
                  <>
                    {daySessions.map((session, idx) => (
                      <div key={idx} className="mobile-session-block">
                        <div className="mobile-session-code">{session.courseCode}</div>
                        <div className="mobile-session-section">{session.section}</div>
                        <div className="mobile-session-time">
                          {session.startTime} - {session.endTime}
                        </div>
                        {session.venue && (
                          <div className="mobile-session-venue">{session.venue}</div>
                        )}
                      </div>
                    ))}
                    {dayBlockouts.map((blockout, idx) => (
                      <div key={`blockout-${idx}`} className="mobile-blockout-block">
                        <div className="mobile-blockout-name">{blockout.name}</div>
                        <div className="mobile-blockout-time">
                          {blockout.startTime} - {blockout.endTime}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MobileCalendar;
