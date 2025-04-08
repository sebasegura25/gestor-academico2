import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertCareerSchema, 
  insertSubjectSchema, 
  insertRequirementSchema,
  insertStudentSchema,
  insertStudentSubjectSchema,
  insertEnrollmentSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Inicializar el usuario administrador por defecto
  try {
    await storage.initializeAdminUser();
    console.log("Admin user initialization completed");
  } catch (error) {
    console.error("Error initializing admin user:", error);
  }
  
  // Set up authentication routes
  setupAuth(app);
  
  // Careers routes
  app.get("/api/careers", async (req, res) => {
    try {
      const careers = await storage.getCareers();
      res.json(careers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch careers" });
    }
  });
  
  app.get("/api/careers/:id", async (req, res) => {
    try {
      const career = await storage.getCareer(parseInt(req.params.id));
      if (!career) {
        return res.status(404).json({ error: "Career not found" });
      }
      res.json(career);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch career" });
    }
  });
  
  app.post("/api/careers", async (req, res) => {
    try {
      const validatedData = insertCareerSchema.parse(req.body);
      const career = await storage.createCareer(validatedData);
      res.status(201).json(career);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create career" });
    }
  });
  
  app.put("/api/careers/:id", async (req, res) => {
    try {
      const validatedData = insertCareerSchema.partial().parse(req.body);
      const career = await storage.updateCareer(parseInt(req.params.id), validatedData);
      res.json(career);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update career" });
    }
  });
  
  app.delete("/api/careers/:id", async (req, res) => {
    try {
      await storage.deleteCareer(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete career" });
    }
  });
  
  // Subjects routes
  app.get("/api/subjects", async (req, res) => {
    try {
      const careerId = req.query.careerId ? parseInt(req.query.careerId as string) : undefined;
      const subjects = await storage.getSubjects(careerId);
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  });
  
  app.get("/api/subjects/:id", async (req, res) => {
    try {
      const subject = await storage.getSubject(parseInt(req.params.id));
      if (!subject) {
        return res.status(404).json({ error: "Subject not found" });
      }
      res.json(subject);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subject" });
    }
  });
  
  app.get("/api/careers/:careerId/subjects", async (req, res) => {
    try {
      const careerId = parseInt(req.params.careerId);
      const subjects = await storage.getSubjects(careerId);
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subjects for career" });
    }
  });

  app.get("/api/careers/:careerId/subjects/year/:year", async (req, res) => {
    try {
      const careerId = parseInt(req.params.careerId);
      const year = parseInt(req.params.year);
      const subjects = await storage.getSubjectsByYear(careerId, year);
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subjects by year" });
    }
  });
  
  app.post("/api/subjects", async (req, res) => {
    try {
      const validatedData = insertSubjectSchema.parse(req.body);
      const subject = await storage.createSubject(validatedData);
      res.status(201).json(subject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create subject" });
    }
  });
  
  app.put("/api/subjects/:id", async (req, res) => {
    try {
      const validatedData = insertSubjectSchema.partial().parse(req.body);
      const subject = await storage.updateSubject(parseInt(req.params.id), validatedData);
      res.json(subject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update subject" });
    }
  });
  
  app.delete("/api/subjects/:id", async (req, res) => {
    try {
      await storage.deleteSubject(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete subject" });
    }
  });
  
  // Requirements routes
  app.get("/api/subjects/:id/requirements", async (req, res) => {
    try {
      const requirements = await storage.getRequirements(parseInt(req.params.id));
      
      // Get full subject details for each requirement
      const fullRequirements = await Promise.all(
        requirements.map(async (req) => {
          const subject = await storage.getSubject(req.requiredSubjectId);
          return {
            ...req,
            requiredSubject: subject
          };
        })
      );
      
      res.json(fullRequirements);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch requirements" });
    }
  });
  
  app.post("/api/requirements", async (req, res) => {
    try {
      const validatedData = insertRequirementSchema.parse(req.body);
      const requirement = await storage.addRequirement(validatedData);
      res.status(201).json(requirement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to add requirement" });
    }
  });
  
  app.delete("/api/requirements/:id", async (req, res) => {
    try {
      await storage.removeRequirement(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete requirement" });
    }
  });
  
  // Students routes
  app.get("/api/students", async (req, res) => {
    try {
      const students = await storage.getStudents();
      
      // Get full user and career details for each student
      const fullStudents = await Promise.all(
        students.map(async (student) => {
          const user = await storage.getUser(student.userId);
          const career = await storage.getCareer(student.careerId);
          return {
            ...student,
            user,
            career
          };
        })
      );
      
      res.json(fullStudents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });
  
  app.get("/api/students/with-details", async (req, res) => {
    try {
      const students = await storage.getStudents();
      
      // Get full user and career details for each student
      const fullStudents = await Promise.all(
        students.map(async (student) => {
          const user = await storage.getUser(student.userId);
          const career = await storage.getCareer(student.careerId);
          return {
            ...student,
            user: {
              id: user?.id,
              username: user?.username,
              fullName: user?.fullName,
              email: user?.email,
              role: user?.role
            },
            career: {
              id: career?.id,
              name: career?.name
            }
          };
        })
      );
      
      res.json(fullStudents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students with details" });
    }
  });
  
  app.get("/api/students/:id", async (req, res) => {
    try {
      const student = await storage.getStudent(parseInt(req.params.id));
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      
      const user = await storage.getUser(student.userId);
      const career = await storage.getCareer(student.careerId);
      
      res.json({
        ...student,
        user,
        career
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student" });
    }
  });
  
  app.get("/api/user/student", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    try {
      const student = await storage.getStudentByUserId(req.user.id);
      if (!student) {
        return res.status(404).json({ error: "Student record not found" });
      }
      
      const career = await storage.getCareer(student.careerId);
      
      res.json({
        ...student,
        user: req.user,
        career
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student record" });
    }
  });
  
  app.post("/api/students", async (req, res) => {
    try {
      // Extraer los datos del usuario
      const { username, password, fullName, email, careerId, fileNumber, documentId, enrollmentYear, enrollmentDate, status } = req.body;
      
      // Validar que se proporcionan los campos necesarios
      if (!username || !password || !fullName || !email || !careerId || !fileNumber || !documentId || !enrollmentYear || !enrollmentDate) {
        return res.status(400).json({ error: "Faltan campos requeridos" });
      }
      
      // Verificar si el nombre de usuario ya existe
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "El nombre de usuario ya está en uso" });
      }
      
      // Verificar si el número de legajo ya existe
      const students = await storage.getStudents();
      const existingFileNumber = students.find(s => s.fileNumber === fileNumber);
      if (existingFileNumber) {
        return res.status(400).json({ error: "El número de legajo ya está en uso" });
      }
      
      // Hashear la contraseña
      const { hashPassword } = await import('./auth-utils.js');
      const hashedPassword = await hashPassword(password);
      
      // Crear el usuario primero
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        fullName,
        email,
        role: "student"
      });
      
      // Luego crear el estudiante con el ID del usuario creado
      const studentData = {
        userId: user.id,
        careerId: parseInt(careerId),
        fileNumber,
        documentId,
        enrollmentYear: parseInt(enrollmentYear),
        enrollmentDate: new Date(enrollmentDate),
        status: status || "active"
      };
      
      // Validar con el schema
      const validatedData = insertStudentSchema.parse(studentData);
      const student = await storage.createStudent(validatedData);
      
      // Devolver respuesta exitosa
      res.status(201).json({
        ...student,
        user
      });
    } catch (error) {
      console.error("Error creating student:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      
      // Error genérico
      res.status(500).json({ error: "Failed to create student" });
    }
  });
  
  app.put("/api/students/:id", async (req, res) => {
    try {
      const validatedData = insertStudentSchema.partial().parse(req.body);
      const student = await storage.updateStudent(parseInt(req.params.id), validatedData);
      res.json(student);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update student" });
    }
  });
  
  // Student-Subject routes
  app.get("/api/students/:id/subjects", async (req, res) => {
    try {
      const studentSubjects = await storage.getStudentSubjectsWithDetails(parseInt(req.params.id));
      res.json(studentSubjects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student subjects" });
    }
  });
  
  app.post("/api/student-subjects", async (req, res) => {
    try {
      const validatedData = insertStudentSubjectSchema.parse(req.body);
      const studentSubject = await storage.addStudentSubject(validatedData);
      res.status(201).json(studentSubject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to add student subject" });
    }
  });
  
  app.patch("/api/student-subjects/:id", async (req, res) => {
    try {
      const { status, grade, date, book, folio } = req.body;
      
      if (status && !["cursando", "acreditada", "libre"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      
      // Validar campos requeridos para estado acreditada
      if (status === "acreditada" && !grade) {
        return res.status(400).json({ error: "Grade is required for accredited subjects" });
      }
      
      // Actualizar el estado y datos adicionales
      const studentSubject = await storage.updateStudentSubject(
        parseInt(req.params.id),
        {
          status,
          grade: grade ? parseInt(grade) : null,
          date: date ? new Date(date) : null,
          book,
          folio
        }
      );
      
      res.json(studentSubject);
    } catch (error) {
      res.status(500).json({ error: "Failed to update student subject" });
    }
  });
  
  // Enrollments routes
  app.get("/api/enrollments", async (req, res) => {
    try {
      const studentId = req.query.studentId ? parseInt(req.query.studentId as string) : undefined;
      const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string) : undefined;
      
      const enrollments = await storage.getEnrollments(studentId, subjectId);
      
      // Get full details
      const fullEnrollments = await Promise.all(
        enrollments.map(async (enrollment) => {
          const student = await storage.getStudent(enrollment.studentId);
          const subject = await storage.getSubject(enrollment.subjectId);
          return {
            ...enrollment,
            student,
            subject
          };
        })
      );
      
      res.json(fullEnrollments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch enrollments" });
    }
  });
  
  app.post("/api/enrollments", async (req, res) => {
    try {
      const validatedData = insertEnrollmentSchema.parse(req.body);
      
      // Check prerequisites
      const subject = await storage.getSubject(validatedData.subjectId);
      if (!subject) {
        return res.status(400).json({ error: "Subject not found" });
      }
      
      const requirements = await storage.getRequirements(subject.id);
      
      // For each requirement, check if the student has passed it
      for (const requirement of requirements) {
        const studentSubjects = await storage.getStudentSubjects(validatedData.studentId);
        const hasCompleted = studentSubjects.some(
          ss => ss.subjectId === requirement.requiredSubjectId && 
              (ss.status === "acreditada" || ss.status === "regular")
        );
        
        if (!hasCompleted) {
          const requiredSubject = await storage.getSubject(requirement.requiredSubjectId);
          return res.status(400).json({ 
            error: `Falta regularizar materia ${requiredSubject?.code} - ${requiredSubject?.name}` 
          });
        }
      }
      
      const enrollment = await storage.createEnrollment(validatedData);
      
      // If this is a "cursada" enrollment, create a student-subject record with "cursando" status
      if (validatedData.type === "cursada") {
        await storage.addStudentSubject({
          studentId: validatedData.studentId,
          subjectId: validatedData.subjectId,
          status: "cursando",
          grade: null,
          date: null,
          book: null,
          folio: null
        });
      }
      
      res.status(201).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create enrollment" });
    }
  });
  
  app.delete("/api/enrollments/:id", async (req, res) => {
    try {
      await storage.deleteEnrollment(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete enrollment" });
    }
  });
  
  // Statistics for dashboard
  app.get("/api/statistics", async (req, res) => {
    try {
      const students = await storage.getStudents();
      const careers = await storage.getCareers();
      const subjects = await storage.getSubjects();
      const enrollments = await storage.getEnrollments();
      
      // Get active enrollments (within the last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const activeEnrollments = enrollments.filter(
        e => e.createdAt && new Date(e.createdAt) > sixMonthsAgo
      );
      
      res.json({
        studentCount: students.length,
        careerCount: careers.length,
        subjectCount: subjects.length,
        activeEnrollmentCount: activeEnrollments.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });
  
  // Get count of subjects for a specific career
  app.get("/api/careers/:id/subject-count", async (req, res) => {
    try {
      const careerId = parseInt(req.params.id);
      const subjects = await storage.getSubjects(careerId);
      
      res.json({ count: subjects.length });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener conteo de materias" });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}
