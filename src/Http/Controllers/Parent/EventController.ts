import { Request, Response } from 'express';
import { Event } from '../../../Models/Event';
import { Op } from 'sequelize';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import weekday from 'dayjs/plugin/weekday';
import { Roster } from '../../../Models/Roster';
import { VideoMeetingInvitations } from '../../../Models/VideoMeetingInvitations';
import { Child } from '../../../Models/Child';
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(weekday);

// Helper to dynamically set date range for a given month, similar to PHP logic
function setDateDynamically(requestDate: string | null, event: any) {
  const now = dayjs().startOf('month');
  let reqDate = requestDate ? dayjs(requestDate).startOf('month') : now;

  // If the requested month is the current month, return the event's full range
  if (now.isSame(reqDate, 'month')) {
    return {
      start_date: dayjs(event.class_start),
      end_date: dayjs(event.class_end)
    };
  }

  // Get the weekday name of the event's end date (e.g., "Monday")
  const startDay = dayjs(event.event_end_date).format('dddd').toLowerCase();
  const monthStr = reqDate.format('YYYY-MM');

  // Map weekday names to numbers for dayjs
  const weekdayMap: { [key: string]: number } = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };
  const weekdayNum = weekdayMap[startDay];

  // Find the first and last occurrence of that weekday in the requested month
  let firstWeekday = dayjs(`${monthStr}-01`).day(weekdayNum);
  if (firstWeekday.month() !== reqDate.month()) {
    firstWeekday = firstWeekday.add(7, 'day');
  }
  const lastDayOfMonth = reqDate.endOf('month');
  let lastWeekday = lastDayOfMonth.day(weekdayNum);
  if (lastWeekday.month() !== reqDate.month()) {
    lastWeekday = lastWeekday.subtract(7, 'day');
  }
  // Set the correct times
  const startTime = event.event_time ? event.event_time.split(':') : ['0','0','0'];
  const endTime = event.event_end_time ? event.event_end_time.split(':') : ['0','0','0'];
  const startDateTime = firstWeekday.set('hour', parseInt(startTime[0])).set('minute', parseInt(startTime[1])).set('second', parseInt(startTime[2]));
  const endDateTime = lastWeekday.set('hour', parseInt(endTime[0])).set('minute', parseInt(endTime[1])).set('second', parseInt(endTime[2]));

  return {
    start_date: startDateTime,
    end_date: endDateTime
  };
}

export class EventController {
  async fetch(req: Request, res: Response) {
    try {
      const eventid = req.params.eventid;
      const event = await Event.findOne({
        where: {
          splms_event_id: eventid,
          ...Event.activeMembershipsClasses(),
          ...Event.regcutoffMembershipClasses(),
        },
        include: [{ association: 'SportsRotation' }],
      });
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      const e = event as any;
      // Alias class_start and class_end to event_start_date and event_end_date if not present
      if (!('class_start' in e)) e.class_start = e.event_start_date;
      if (!('class_end' in e)) e.class_end = e.event_end_date;
      // const week_number = {sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6};
      const classEvents: any[] = [];
      // membership_test == 1 block is commented out in PHP, so we skip it
      let no_days: string[] = [];
      if (e.no_class_days) {
        try {
          no_days = JSON.parse(e.no_class_days);
        } catch {}
      }
      console.log('no_days:', no_days); // DEBUG: log parsed no_class_days
      // Date helpers
      const format = 'YYYY-MM-DD';
      // Dynamically set date range if date filter is provided
      const { date } = req.query;
      const { start_date, end_date } = setDateDynamically(date ? String(date) : null, e);
      // Daterange logic (match PHP: start at start_date, add 1 week each time, stop at or before end_date)
      let current = start_date;
      const endDate = end_date;
      const addedDates = new Set();
      while (current.isSameOrBefore(endDate)) {
        const dateStr = current.format('MM-DD-YYYY');
        if (!no_days.includes(dateStr)) {
          classEvents.push({
            title: '',
            alias: e.alias,
            start: current.format(format),
            end: current.format(format),
            eventst: dayjs(e.class_start).format(format),
            eventend: dayjs(e.class_end).format(format),
            rendering: 'background',
            backgroundColor: 'green',
            allDay: true,
            className: 'green',
          });
          addedDates.add(current.format(format));
        }
        current = current.add(1, 'week');
      }
      // Add red events for all no_class_days (if within event date range)
      if (no_days.length > 0) {
        for (const dateStr of no_days) {
          const date = dayjs(dateStr, 'MM-DD-YYYY');
          if ((date.isSameOrAfter(dayjs(e.event_start_date)) && date.isSameOrBefore(dayjs(e.event_end_date))) && !addedDates.has(date.format(format))) {
            classEvents.push({
              title: '',
              alias: e.alias,
              start: date.format(format),
              end: date.format(format),
              eventst: dayjs(e.class_start).format(format),
              eventend: dayjs(e.class_end).format(format),
              rendering: 'background',
              backgroundColor: 'red',
              className: 'red',
              allDay: true,
            });
            addedDates.add(date.format(format));
            // Add purple makeup day if set
            if (e.prefered_makup_day != null && e.prefered_makup_day !== '' && e.prefered_makup_day !== '0') {
              const makeupDate = date.startOf('week').add(Number(e.prefered_makup_day) - 1, 'day');
              if (!addedDates.has(makeupDate.format(format))) {
                classEvents.push({
                  title: '',
                  alias: e.alias,
                  start: makeupDate.format(format),
                  end: makeupDate.format(format),
                  eventst: dayjs(e.class_start).format(format),
                  eventend: dayjs(e.class_end).format(format),
                  rendering: 'background',
                  backgroundColor: 'purple',
                  textColor: 'white',
                  className: 'purple',
                  allDay: true,
                });
                addedDates.add(makeupDate.format(format));
              }
            }
          }
        }
      }

      // Filter by start and end query params if provided
      const { start, end } = req.query;
      let filteredEvents = classEvents;
      if (start && end) {
        const startDate = dayjs(start as string);
        const endDate = dayjs(end as string);
        filteredEvents = classEvents.filter(ev => {
          const evStart = dayjs(ev.start);
          return (evStart.isSame(startDate) || evStart.isAfter(startDate)) &&
                 (evStart.isSame(endDate) || evStart.isBefore(endDate));
        });
      }
      return res.json(filteredEvents);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch event', details: err.message });
    }
  }

  async fetchChildEvents(req: Request, res: Response) {
    try {
      const user_id = (req as any).user_id;
      const email = (req as any).email;
      if (!user_id || !email) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      // Get all children for the user
      const children = await Child.findAll({ where: { user_id } });
      const classEvents: any[] = [];
      // Fetch meetings for the user
      const meetings = await VideoMeetingInvitations.findAll({
        where: { post_view: 1, email },
        include: [{ association: 'meeting', include: [{ association: 'event' }] }],
      });
      for (const child of children) {
        // Get all active rosters with an event
        const rosters = await Roster.findAll({
          where: { children_id: child.id, active: { [Op.gte]: 1 } },
          include: [{ association: 'event' }],
        });
        // Filter for active events using Model methods
        const activeRosters = rosters.filter((roster: any) => {
          const event = (roster as any).event;
          if (!event) return false;
          
          // Apply activeMembershipsClasses logic
          const activeConditions = Event.activeMembershipsClasses();
          const isActive = (
            event.enabled === activeConditions.enabled &&
            event.freezed === activeConditions.freezed &&
            (
              dayjs(event.event_end_date).isSameOrAfter(dayjs(), 'day') ||
              event.membership_test == 1
            )
          );
          
          // Apply regcutoffMembershipClasses logic
          const regcutoffConditions = Event.regcutoffMembershipClasses();
          const isRegcutoff = (
            dayjs(event.halt_date).isSameOrAfter(dayjs(), 'day') ||
            event.membership_test == 1
          );
          
          return isActive && isRegcutoff;
        });
        for (const roster of activeRosters) {
          const event = (roster as any).event;
          const e = event as any;
          const format = 'YYYY-MM-DD';
          let no_days: string[] = [];
          if (e.no_class_days) {
            try { no_days = JSON.parse(e.no_class_days); } catch {}
          }
          // Add start event
          classEvents.push({
            title: '',
            alias: e.alias,
            start: dayjs(e.class_start).format(format),
            end: dayjs(e.class_start).format(format),
            eventst: dayjs(e.class_start).format(format),
            eventend: dayjs(e.class_end).format(format),
            rendering: 'background',
            backgroundColor: '#32CD32',
            allDay: true,
          });
          // Add end event
          classEvents.push({
            title: '',
            alias: e.alias,
            start: dayjs(e.class_end).format(format),
            end: dayjs(e.class_end).format(format),
            eventst: dayjs(e.class_start).format(format),
            eventend: dayjs(e.class_end).format(format),
            rendering: 'background',
            backgroundColor: '#32CD32',
            allDay: true,
          });
          // Daterange: weekly from class_start to class_end
          let current = dayjs(e.class_start).add(1, 'week');
          const endDate = dayjs(e.class_end);
          while (current.isBefore(endDate)) {
            const dateStr = current.format('MM-DD-YYYY');
            if (!no_days.includes(dateStr)) {
              classEvents.push({
                title: '',
                alias: e.alias,
                start: current.format(format),
                end: current.format(format),
                eventst: dayjs(e.class_start).format(format),
                eventend: dayjs(e.class_end).format(format),
                rendering: 'background',
                backgroundColor: '#32CD32',
                allDay: true,
              });
            }
            current = current.add(1, 'week');
          }
          // Add no_class_days as red events
          if (no_days.length > 0) {
            for (const dateStr of no_days) {
              const date = dayjs(dateStr, 'MM-DD-YYYY');
              classEvents.push({
                title: '',
                alias: e.alias,
                start: date.format(format),
                end: date.format(format),
                eventst: dayjs(e.class_start).format(format),
                eventend: dayjs(e.class_end).format(format),
                rendering: 'background',
                backgroundColor: 'red',
                allDay: true,
              });
            }
          }
        }
      }
      // Add meetings as events
      for (const meeting of meetings) {
        const m = meeting as any;
        if (!m.meeting) continue;
        classEvents.push({
          title: '',
          alias: m.meeting.alias,
          start: dayjs(m.meeting.start_date_time).format('YYYY-MM-DD'),
          end: dayjs(m.meeting.meeting_end_time).format('YYYY-MM-DD'),
          eventst: dayjs(m.meeting.start_date_time).format('YYYY-MM-DD'),
          eventend: dayjs(m.meeting.meeting_end_time).format('YYYY-MM-DD'),
          rendering: 'background',
          backgroundColor: 'f96a04',
          allDay: true,
        });
      }
      // Date filter
      const { start, end } = req.query;
      let filteredEvents = classEvents;
      if (start && end) {
        const startDate = dayjs(start as string);
        const endDate = dayjs(end as string);
        filteredEvents = classEvents.filter(ev => {
          const evStart = dayjs(ev.start);
          return (evStart.isSame(startDate) || evStart.isAfter(startDate)) &&
                 (evStart.isSame(endDate) || evStart.isBefore(endDate));
        });
      }
      return res.json(filteredEvents);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch child events', details: err.message });
    }
  }
} 