import { Router } from 'express';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// --- Weekly Plans ---
router.get('/weekly-plans', async (_req, res) => {
  try {
    const plans = await db.select().from(schema.weeklyPlans);
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get weekly plans' });
  }
});

router.get('/weekly-plans/:weekStartDate', async (req, res) => {
  try {
    const [plan] = await db.select().from(schema.weeklyPlans)
      .where(eq(schema.weeklyPlans.weekStartDate, req.params.weekStartDate));
    if (!plan) return res.json(null);

    const slots = await db.select().from(schema.weeklySlots)
      .where(eq(schema.weeklySlots.weeklyPlanId, plan.id));
    res.json({ ...plan, slots });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get weekly plan' });
  }
});

router.post('/weekly-plans', async (req, res) => {
  try {
    const { slots, ...planData } = req.body;
    const [plan] = await db.insert(schema.weeklyPlans).values(planData).returning();

    if (slots && slots.length > 0) {
      for (const slot of slots) {
        await db.insert(schema.weeklySlots).values({ ...slot, weeklyPlanId: plan.id });
      }
    }

    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create weekly plan' });
  }
});

router.put('/weekly-plans/:id', async (req, res) => {
  try {
    const { slots, ...planData } = req.body;
    const [plan] = await db.update(schema.weeklyPlans)
      .set({ ...planData, updatedAt: new Date() })
      .where(eq(schema.weeklyPlans.id, req.params.id))
      .returning();
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update weekly plan' });
  }
});

// --- Monthly Goals ---
router.get('/monthly-goals', async (_req, res) => {
  try {
    const goals = await db.select().from(schema.monthlyGoals);
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get monthly goals' });
  }
});

router.get('/monthly-goals/:year/:month', async (req, res) => {
  try {
    const [goals] = await db.select().from(schema.monthlyGoals)
      .where(and(
        eq(schema.monthlyGoals.year, parseInt(req.params.year)),
        eq(schema.monthlyGoals.month, parseInt(req.params.month)),
      ));
    res.json(goals || null);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get monthly goals' });
  }
});

router.post('/monthly-goals', async (req, res) => {
  try {
    const [goals] = await db.insert(schema.monthlyGoals).values(req.body).returning();
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create monthly goals' });
  }
});

router.put('/monthly-goals/:id', async (req, res) => {
  try {
    const [goals] = await db.update(schema.monthlyGoals)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(schema.monthlyGoals.id, req.params.id))
      .returning();
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update monthly goals' });
  }
});

export default router;
