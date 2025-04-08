import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser, users } from "@shared/schema";
import { db } from "./db";
import { hashPassword, comparePasswords } from "./auth-utils.js";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "gestor-docente-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Usuario o contraseña incorrectos" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, password, fullName, email } = req.body;
      
      if (!username || !password || !fullName || !email) {
        return res.status(400).json({ message: "Todos los campos son requeridos" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "El nombre de usuario ya existe" });
      }
      
      // El rol es "pendiente" por defecto y deberá ser asignado por un administrador
      const hashedPassword = await hashPassword(password);
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        fullName,
        email,
        role: "pendiente"
      });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      req.login(user, (err: any) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: SelectUser | false, info: { message: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Credenciales inválidas" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user as any;
        
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as any;
    
    res.json(userWithoutPassword);
  });
  
  // Middleware para verificar si el usuario es administrador
  const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }
    
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "No tienes permisos de administrador" });
    }
    
    next();
  };
  
  // Ruta para listar todos los usuarios (solo para administradores)
  app.get("/api/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt
      }).from(users);
      
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ message: "Error al obtener usuarios" });
    }
  });
  
  // Ruta para que los administradores asignen roles a los usuarios
  app.patch("/api/users/:id/role", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ message: "El rol es requerido" });
      }
      
      // Validar rol
      const validRoles = ["admin", "docente", "estudiante", "pendiente"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Rol inválido" });
      }
      
      const user = await storage.updateUser(userId, { role });
      
      // Remover la contraseña de la respuesta
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error al actualizar rol" });
    }
  });
}
