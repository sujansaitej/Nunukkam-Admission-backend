import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { userId: user.userId, name: user.name, email: user.email, role: user.role },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: req.user!.userId },
      select: { userId: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users
router.get('/users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { role, active_only } = req.query;
    const where: any = {};
    if (role) where.role = role;
    if (active_only === 'true') where.isActive = true;

    const users = await prisma.user.findMany({
      where,
      select: { userId: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register — Create staff member
router.post('/register', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Only admins can create users
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Only administrators can create staff accounts' });
      return;
    }

    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email and password are required' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || 'counselor' },
      select: { userId: true, name: true, email: true, role: true }
    });

    res.status(201).json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/users/:id — Update staff member
router.patch('/users/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Only administrators can update staff accounts' });
      return;
    }

    const { name, email, role, is_active, password } = req.body;
    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email;
    if (role) data.role = role;
    if (is_active !== undefined) data.isActive = is_active;
    if (password) data.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { userId: req.params.id as string },
      data,
      select: { userId: true, name: true, email: true, role: true, isActive: true }
    });

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
