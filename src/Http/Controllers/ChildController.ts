import { Request, Response } from 'express';
import { Child } from '../../Models/Child';
import { Event } from '../../Models/Event';
import { Roster } from '../../Models/Roster';
import { Enrollment } from '../../Models/Enrollment';
import { User } from '../../Models/User';

// Remove AuthenticatedRequest interface and all req.user logic
// For add, update, and remove, require user_id in req.body or req.params

export class ChildController {
  /**
   * Add a new child (user_id from req.user_id)
   */
  public async add(req: Request, res: Response) {
    try {
      const user_id = (req as any).user_id;
      const { _token, ...childData } = req.body;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }
      const child = await Child.create({
        ...childData,
        user_id: user_id
      });
      return res.status(201).json({ 
        message: 'Child added successfully',
        child: child
      });
    } catch (error) {
      console.error('Error adding child:', error);
      return res.status(500).json({ error: 'Failed to add child' });
    }
  }

  /**
   * Update an existing child (user_id from req.user_id)
   */
  public async update(req: Request, res: Response) {
    try {
      const user_id = (req as any).user_id;
      const { id } = req.params;
      const { _token, ...updateData } = req.body;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }
      const child = await Child.findByPk(id);
      if (!child) {
        return res.status(404).json({ error: 'Child not found' });
      }
      if (child.user_id !== user_id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      await child.update(updateData);
      return res.status(200).json({ 
        message: 'Child updated successfully',
        child_updated: true
      });
    } catch (error) {
      console.error('Error updating child:', error);
      return res.status(500).json({ error: 'Failed to update child' });
    }
  }

  /**
   * Remove a child (user_id from req.user_id)
   */
  public async remove(req: Request, res: Response) {
    try {
      const user_id = (req as any).user_id;
      const { id } = req.params;
      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }
      const child = await Child.findByPk(id);
      if (!child) {
        return res.status(404).json({ error: 'Child not found' });
      }
      if (child.user_id !== user_id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const rosters = await Roster.findAll({
        where: { children_id: child.id },
        include: [{ model: Event, as: 'event' }]
      });
      const now = new Date();
      const anyActiveEvent = rosters.some((roster: any) => {
        if (!roster.event) return false;
        const eventStart = new Date(roster.event.event_start_date || '');
        const eventEnd = new Date(roster.event.event_end_date || '');
        return (eventStart <= now) && (eventEnd >= now);
      });
      if (!anyActiveEvent) {
        await Enrollment.destroy({
          where: { child_id: child.id }
        });
        await child.destroy();
        return res.status(200).json({ 
          message: 'Child deleted successfully',
          child_deleted: child
        });
      } else {
        return res.status(400).json({ 
          error: `${child.first_name} is currently enrolled in an active session and cannot be deleted.`
        });
      }
    } catch (error) {
      console.error('Error removing child:', error);
      return res.status(500).json({ error: 'Failed to remove child' });
    }
  }
} 